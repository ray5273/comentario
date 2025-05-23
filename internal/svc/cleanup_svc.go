package svc

import (
	"database/sql"
	"github.com/doug-martin/goqu/v9"
	"gitlab.com/comentario/comentario/internal/persistence"
	"gitlab.com/comentario/comentario/internal/util"
	"sync"
	"time"
)

// CleanupService is a service that cleans up stale data and deals with data inconsistencies
type CleanupService interface {
	// Run the service
	Run() error
	// Shutdown the service
	Shutdown()
}

// NewCleanupService instantiates and returns a new CleanupService
func NewCleanupService(db *persistence.Database) CleanupService {
	cs := &cleanupService{dbTxAware: dbTxAware{db: db}, stop: make(chan bool, 1)}
	cs.cl = []*cleaner{
		newCleaner("expired auth sessions", "Removed %d expired auth sessions", time.Hour, cs.cleanupExpiredAuthSessions),
		newCleaner("expired tokens", "Removed %d expired tokens", time.Hour, cs.cleanupExpiredTokens),
		newCleaner("expired user sessions", "Removed %d expired user sessions", util.OneDay, cs.cleanupExpiredUserSessions),
		newCleaner("stale page views", "Removed %d stale page views", util.OneDay, cs.cleanupStalePageViews),
		newCleaner("domain comment count", "Updated comment count in %d domains", 12*time.Hour, cs.updateDomainCommentCounts),
		newCleaner("domain page comment count", "Updated comment count in %d domain pages", 12*time.Hour, cs.updateDomainPageCommentCounts),
	}
	return cs
}

//----------------------------------------------------------------------------------------------------------------------

// newCleaner instantiates and returns a new cleaner
func newCleaner(title, logFmt string, interval time.Duration, proc func() persistence.Executable) *cleaner {
	return &cleaner{
		title:    title,
		logFmt:   logFmt,
		interval: interval,
		proc:     proc,
		stop:     make(chan bool, 1),
	}
}

// cleaner describes a cleanup routine
type cleaner struct {
	title    string                        // Routine title
	logFmt   string                        // Log line format, using %d as a placeholder for the number of rows affected by the Executable
	interval time.Duration                 // Sleep interval between consecutive runs
	proc     func() persistence.Executable // Cleanup procedure, which returns an Executable to execute
	stop     chan bool                     // Cleaner stop signal
}

// run the cleaner routine
func (c *cleaner) run() (i int64, err error) {
	var res sql.Result
	if res, err = c.proc().Executor().Exec(); err != nil {
		logger.Errorf("cleanupService.runCleaner/Exec[%s]: %v", c.title, err)

	} else if i, err = res.RowsAffected(); err != nil {
		logger.Errorf("cleanupService.runCleaner/RowsAffected[%s]: %v", c.title, err)

	} else if i > 0 {
		logger.Infof(c.logFmt, i)
	}
	return
}

//----------------------------------------------------------------------------------------------------------------------

// cleanupService is a blueprint CleanupService implementation
type cleanupService struct {
	dbTxAware
	cl   []*cleaner     // List of available cleaners
	stop chan bool      // Service stop signal
	wg   sync.WaitGroup // Wait group for shutting down cleaners
}

func (svc *cleanupService) Run() error {
	logger.Debugf("cleanupService.Run()")
	go svc.startCleaners()
	return nil
}

func (svc *cleanupService) Shutdown() {
	logger.Debugf("cleanupService.Shutdown()")

	// Interrupt cleaner startup, if it's running
	svc.stop <- true

	// Stop all cleaners
	for _, c := range svc.cl {
		logger.Debugf("Stopping cleaner: %s", c.title)
		c.stop <- true
	}
	svc.wg.Wait()
}

// cleanupExpiredAuthSessions removes all expired auth sessions from the database
func (svc *cleanupService) cleanupExpiredAuthSessions() persistence.Executable {
	return svc.dbx().Delete("cm_auth_sessions").Where(goqu.I("ts_expires").Lt(time.Now().UTC()))
}

// cleanupExpiredTokens removes all expired tokens from the database
func (svc *cleanupService) cleanupExpiredTokens() persistence.Executable {
	return svc.dbx().Delete("cm_tokens").Where(goqu.I("ts_expires").Lt(time.Now().UTC()))
}

// cleanupExpiredUserSessions removes all expired user sessions from the database
func (svc *cleanupService) cleanupExpiredUserSessions() persistence.Executable {
	return svc.dbx().Delete("cm_user_sessions").Where(goqu.I("ts_expires").Lt(time.Now().UTC()))
}

// cleanupStalePageViews removes stale page view stats from the database
func (svc *cleanupService) cleanupStalePageViews() persistence.Executable {
	return svc.dbx().Delete("cm_domain_page_views").
		Where(goqu.I("ts_created").Lt(time.Now().UTC().Add(-util.PageViewRetentionPeriod)))
}

// updateDomainCommentCounts ensures the number of comments for each domain is correct
func (svc *cleanupService) updateDomainCommentCounts() persistence.Executable {
	return svc.dbx().Update("cm_domains").
		Set(goqu.Record{"count_comments": goqu.I("cc.cnt")}).
		From(
			svc.dbx().
				From(goqu.T("cm_comments").As("c")).
				Select("dp.domain_id", goqu.COUNT("*").As("cnt")).
				Join(goqu.T("cm_domain_pages").As("dp"), goqu.On(goqu.Ex{"dp.id": goqu.I("c.page_id")})).
				Where(goqu.Ex{"c.is_deleted": false}).
				GroupBy("dp.domain_id").
				As("cc")).
		Where(
			goqu.C("id").Eq(goqu.I("cc.domain_id")),
			goqu.C("count_comments").Neq(goqu.I("cc.cnt")))
}

// updateDomainPageCommentCounts ensures the number of comments for each domain page is correct
func (svc *cleanupService) updateDomainPageCommentCounts() persistence.Executable {
	return svc.dbx().Update("cm_domain_pages").
		Set(goqu.Record{"count_comments": goqu.I("cc.cnt")}).
		From(
			svc.dbx().
				From("cm_comments").
				Select("page_id", goqu.COUNT("*").As("cnt")).
				Where(goqu.Ex{"is_deleted": false}).
				GroupBy("page_id").
				As("cc")).
		Where(
			goqu.C("id").Eq(goqu.I("cc.page_id")),
			goqu.C("count_comments").Neq(goqu.I("cc.cnt")))
}

// runCleaner runs the given cleaner in an endless loop, sleeping between the runs
func (svc *cleanupService) runCleaner(c *cleaner) {
	defer svc.wg.Done()
	for {
		// Run the cleaner, ignoring any errors
		_, _ = c.run()

		select {
		// Pause for the given duration
		case <-time.After(c.interval):
			break
		// Interrupt the cleaner loop whenever a stop signal arrives
		case <-c.stop:
			logger.Debugf("Stopped cleaner: %s", c.title)
			return
		}
	}
}

// startCleaners starts all cleaner routines
func (svc *cleanupService) startCleaners() {
	logger.Info("Starting up cleaners")
	for _, c := range svc.cl {
		logger.Debugf("Starting cleaner: %s", c.title)
		go svc.runCleaner(c)

		// Register the cleaner in the wait group
		svc.wg.Add(1)

		// Space the processes out a bit
		select {
		case <-time.After(time.Second):
			break
		case <-svc.stop:
			logger.Info("Cleaner startup interrupted")
			return
		}
	}
}
