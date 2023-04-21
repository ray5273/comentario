package exmodels

import "errors"

// Error is a standard model for errors returned by "generic" error responders
type Error struct {
	ID      string `json:"id"`
	Message string `json:"message,omitempty"`
	Details string `json:"details,omitempty"`
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
