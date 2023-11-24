package svc

import (
	"database/sql"
	"errors"
	"github.com/op/go-logging"
)

// logger represents a package-wide logger instance
var logger = logging.MustGetLogger("svc")

var (
	ErrBadToken      = errors.New("services: invalid token")
	ErrDB            = errors.New("services: database error")
	ErrEmailSend     = errors.New("services: failed to send email")
	ErrNotFound      = errors.New("services: object not found")
	ErrResourceFetch = errors.New("services: failed to fetch resource")
)

// checkErrors picks and returns the first non-nil error, or nil if there's none
func checkErrors(errs ...error) error {
	for _, err := range errs {
		if err != nil {
			return err
		}
	}
	return nil
}

// translateDBErrors "translates" database errors into a service error, picking the first non-nil error
func translateDBErrors(errs ...error) error {
	switch err := checkErrors(errs...); {
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
