package exmodels

import (
	"context"
	"errors"
	"github.com/go-openapi/strfmt"
)

// Error is a standard model for errors returned by "generic" error responders
type Error struct {
	ID      string `json:"id"`
	Message string `json:"message,omitempty"`
	Details string `json:"details,omitempty"`
}

// ErrorFrom returns an new Error instance from the given Go error (which can also be nil)
func ErrorFrom(err error) *Error {
	if err == nil {
		return nil
	}
	return &Error{Message: err.Error()}
}

// Error converts this error into an error instance
func (e *Error) Error() error {
	return errors.New(e.String())
}

// String returns a user-friendly error description
func (e *Error) String() string {
	s := e.Message
	if e.Details != "" {
		s += " (" + e.Details + ")"
	}
	return s
}

// WithDetails returns a copy of the error with added details
func (e *Error) WithDetails(details string) *Error {
	return &Error{
		ID:      e.ID,
		Message: e.Message,
		Details: details,
	}
}

// Validate is a stub implementation of Validatable to let Error model be used in OpenAPI
func (e *Error) Validate(strfmt.Registry) error {
	return nil
}

// ContextValidate is a stub implementation of ContextValidatable to let Error model be used in OpenAPI
func (e *Error) ContextValidate(context.Context, strfmt.Registry) error {
	return nil
}
