package svc

import (
	"database/sql"
	"errors"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/persistence"
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

// execOne executes the provided Executable statement and verifies there's exactly one row affected
func execOne(x persistence.Executable) error {
	return persistence.ExecOne(x)
}

// translateDBErrors "translates" database errors into a service error, picking the first non-nil error
func translateDBErrors(errs ...error) error {
	switch err := util.CheckErrors(errs...); {
	case err == nil:
		// No error
		return nil
	case errors.Is(err, sql.ErrNoRows):
		// Not found
		return ErrNotFound
	default:
		// Any other database error
		return ErrDB
	}
}
