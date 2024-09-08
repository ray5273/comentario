package exmodels

import (
	"context"
	"github.com/go-openapi/strfmt"
)

// ---------------------------------------------------------------------------------------------------------------------

// I18nMessageMap represents a typed string-to-string map used for keeping i18n messages
type I18nMessageMap map[string]string

// Validate is a part of interfaces.Validatable implementation
func (m I18nMessageMap) Validate(strfmt.Registry) error {
	return nil
}

// ContextValidate is a part of interfaces.ContextValidatable implementation
func (m I18nMessageMap) ContextValidate(context.Context, strfmt.Registry) error {
	return nil
}
