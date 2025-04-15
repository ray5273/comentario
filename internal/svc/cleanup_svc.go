package svc

import (
	"github.com/doug-martin/goqu/v9"
	"gitlab.com/comentario/comentario/internal/persistence"
	"gitlab.com/comentario/comentario/internal/util"
	"time"
)

type CleanupService interface {
	// Run the service
	Run() error
}

type cleanupService struct{ dbTxAware }

func (svc *cleanupService) Run() error {
	logger.Debugf("cleanupService: initialising")
	go svc.cleanupExpiredAuthSessions()
	go svc.cleanupExpiredTokens()
	go svc.cleanupExpiredUserSessions()
	go svc.cleanupStalePageViews()
	return nil
}

// cleanupExpiredAuthSessions removes all expired auth sessions from the database
func (svc *cleanupService) cleanupExpiredAuthSessions() {
	logger.Debug("cleanupService.cleanupExpiredAuthSessions()")
	for {
		svc.runLogSleep(
			time.Hour,
			"expired auth sessions",
			svc.dbx().Delete("cm_auth_sessions").Where(goqu.I("ts_expires").Lt(time.Now().UTC())))
	}
}

// cleanupExpiredTokens removes all expired tokens from the database
func (svc *cleanupService) cleanupExpiredTokens() {
	logger.Debug("cleanupService.cleanupExpiredTokens()")
	for {
		svc.runLogSleep(
			time.Hour,
			"expired tokens",
			svc.dbx().Delete("cm_tokens").Where(goqu.I("ts_expires").Lt(time.Now().UTC())))
	}
}

// cleanupExpiredUserSessions removes all expired user sessions from the database
func (svc *cleanupService) cleanupExpiredUserSessions() {
	logger.Debug("cleanupService.cleanupExpiredUserSessions()")
	for {
		svc.runLogSleep(
			util.OneDay,
			"expired user sessions",
			svc.dbx().Delete("cm_user_sessions").Where(goqu.I("ts_expires").Lt(time.Now().UTC())))
	}
}

// cleanupStalePageViews removes stale page view stats from the database
func (svc *cleanupService) cleanupStalePageViews() {
	logger.Debug("cleanupService.cleanupStalePageViews()")
	for {
		svc.runLogSleep(
			util.OneDay,
			"stale page views",
			svc.dbx().Delete("cm_domain_page_views").
				Where(goqu.I("ts_created").Lt(time.Now().UTC().Add(-util.PageViewRetentionPeriod))))
	}
}

// runLogSleep runs the provided cleanup query, logs the outcome, then sleeps for the given duration
func (svc *cleanupService) runLogSleep(interval time.Duration, entity string, x persistence.Executable) {
	if res, err := x.Executor().Exec(); err != nil {
		logger.Errorf("cleanupService.runLogSleep/Delete[%s]: %v", entity, err)
	} else if i, err := res.RowsAffected(); err == nil && i > 0 {
		logger.Infof("Cleanup deleted %d %s", i, entity)
	}
	time.Sleep(interval)
}
