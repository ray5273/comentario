package svc

import (
	"database/sql"
	"errors"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/util"
)

// logger represents a package-wide logger instance
var logger = logging.MustGetLogger("svc")

var (
	ErrBadToken       = errors.New("services: invalid token")
	ErrDB             = errors.New("services: database error")
	ErrCommentTooLong = errors.New("services: comment text too long")
	ErrEmailSend      = errors.New("services: failed to send email")
	ErrNotFound       = errors.New("services: object not found")
	ErrResourceFetch  = errors.New("services: failed to fetch resource")
)

// translateDBErrors "translates" database errors into a service error, picking the first non-nil error and logging it
func translateDBErrors(op string, errs ...error) error {
	err := util.CheckErrors(errs...)
	if err == nil {
		// No error
		return nil
	}

	// Log the operation and the error
	logger.Errorf("%s: DB error: %v", op, err)

	// Translate the DB error into a functional one
	switch {
	case errors.Is(err, sql.ErrNoRows):
		// Not found
		return ErrNotFound
	default:
		// Any other database error
		return ErrDB
	}
}
