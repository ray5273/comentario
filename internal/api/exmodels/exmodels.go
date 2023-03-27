package exmodels

import (
	"context"
	"github.com/go-openapi/strfmt"
)

//----------------------------------------------------------------------------------------------------------------------

// validationStub implements stubbed validation methods of Validatable and ContextValidatable, required by the REST API
type validationStub struct{}

// Validate is a stubbed validation routine
func (*validationStub) Validate(strfmt.Registry) error {
	return nil
}

// ContextValidate is a stubbed validation routine
func (*validationStub) ContextValidate(context.Context, strfmt.Registry) error {
	return nil
}

// ---------------------------------------------------------------------------------------------------------------------

// IdentityProvider holds information about an identity provider
type IdentityProvider struct {
	validationStub
	ID     string `json:"id"`   // Provider ID, matching goth, such as "google"
	Name   string `json:"name"` // Provider display name, such as "Google"
	GothID string `json:"-"`    // ID of the corresponding goth provider (if any)
}
