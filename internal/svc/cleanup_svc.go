package svc

import (
	"github.com/doug-martin/goqu/v9"
	"gitlab.com/comentario/comentario/internal/persistence"
	"gitlab.com/comentario/comentario/internal/util"
	"time"
)

var TheCleanupService CleanupService = &cleanupService{}

type CleanupService interface {
	// Init the service
	Init() error
}

type cleanupService struct{}

func (svc *cleanupService) Init() error {
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
	for svc.runLogSleep(
		time.Hour,
		"expired auth sessions",
		db.Delete("cm_auth_sessions").
			Where(goqu.I("ts_expires").Lt(time.Now().UTC())),
	) == nil {
	}
}

// cleanupExpiredTokens removes all expired tokens from the database
func (svc *cleanupService) cleanupExpiredTokens() {
	logger.Debug("cleanupService.cleanupExpiredTokens()")
	for svc.runLogSleep(
		time.Hour,
		"expired tokens",
		db.Delete("cm_tokens").
			Where(goqu.I("ts_expires").Lt(time.Now().UTC())),
	) == nil {
	}
}

// cleanupExpiredUserSessions removes all expired user sessions from the database
func (svc *cleanupService) cleanupExpiredUserSessions() {
	logger.Debug("cleanupService.cleanupExpiredUserSessions()")
	for svc.runLogSleep(
		util.OneDay,
		"expired user sessions",
		db.Delete("cm_user_sessions").
			Where(goqu.I("ts_expires").Lt(time.Now().UTC())),
	) == nil {
	}
}

// cleanupStalePageViews removes stale page view stats from the database
func (svc *cleanupService) cleanupStalePageViews() {
	logger.Debug("cleanupService.cleanupStalePageViews()")
	for svc.runLogSleep(
		util.OneDay,
		"stale page views",
		db.Delete("cm_domain_page_views").
			Where(goqu.I("ts_created").Lt(time.Now().UTC().Add(-util.PageViewRetentionPeriod))),
	) == nil {
	}
}

// runLogSleep runs the provided cleanup query, logs the outcome, then sleeps for the given duration
func (svc *cleanupService) runLogSleep(interval time.Duration, entity string, x persistence.Executable) error {
	if res, err := x.Executor().Exec(); err != nil {
		logger.Errorf("cleanupService.runLogSleep: Exec() failed for %s: %v", entity, err)
		return err
	} else if i, err := res.RowsAffected(); err == nil && i > 0 {
		logger.Debugf("cleanupService: deleted %d %s", i, entity)
	}
	time.Sleep(interval)
	return nil
}
