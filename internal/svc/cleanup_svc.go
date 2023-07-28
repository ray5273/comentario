package svc

import (
	"gitlab.com/comentario/comentario/internal/util"
	"time"
)

var TheCleanupService CleanupService = &cleanupService{}

type CleanupService interface {
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
		"delete from cm_auth_sessions where ts_expires<$1;",
		time.Now().UTC(),
	) == nil {
	}
}

// cleanupExpiredTokens removes all expired tokens from the database
func (svc *cleanupService) cleanupExpiredTokens() {
	logger.Debug("cleanupService.cleanupExpiredTokens()")
	for svc.runLogSleep(
		time.Hour,
		"expired tokens",
		"delete from cm_tokens where ts_expires<$1;",
		time.Now().UTC(),
	) == nil {
	}
}

// cleanupExpiredUserSessions removes all expired user sessions from the database
func (svc *cleanupService) cleanupExpiredUserSessions() {
	logger.Debug("cleanupService.cleanupExpiredUserSessions()")
	for svc.runLogSleep(
		util.OneDay,
		"expired user sessions",
		"delete from cm_user_sessions where ts_expires<$1;",
		time.Now().UTC(),
	) == nil {
	}
}

// cleanupStalePageViews removes stale page view stats from the database
func (svc *cleanupService) cleanupStalePageViews() {
	logger.Debug("cleanupService.cleanupStalePageViews()")
	for svc.runLogSleep(
		util.OneDay,
		"stale page views",
		"delete from cm_domain_page_views where ts_created<$1;",
		time.Now().UTC().Add(-util.PageViewRetentionPeriod),
	) == nil {
	}
}

// runLogSleep runs the provided cleanup query, logs the outcome, then sleeps for the given duration
func (svc *cleanupService) runLogSleep(interval time.Duration, entity, query string, args ...any) error {
	if res, err := db.ExecRes(query, args...); err != nil {
		logger.Errorf("cleanupService.runLogSleep: Exec() failed for %s: %v", entity, err)
		return err
	} else if i, err := res.RowsAffected(); err == nil && i > 0 {
		logger.Debugf("cleanupService: deleted %d %s", i, entity)
	}
	time.Sleep(interval)
	return nil
}
