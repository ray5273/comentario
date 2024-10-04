package exmodels

import (
	"context"
	"github.com/go-openapi/strfmt"
)

// ---------------------------------------------------------------------------------------------------------------------

// KeyValueMap represents a typed string-to-string map used
type KeyValueMap map[string]string

// Validate is a part of interfaces.Validatable implementation
func (m KeyValueMap) Validate(strfmt.Registry) error {
	return nil
}

// ContextValidate is a part of interfaces.ContextValidatable implementation
func (m KeyValueMap) ContextValidate(context.Context, strfmt.Registry) error {
	return nil
}
