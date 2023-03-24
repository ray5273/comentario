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

// FederatedIdProviderInfo holds information about a known federated identification provider
type FederatedIdProviderInfo struct {
	validationStub
	ID     string `json:"id"`   // Provider ID, matching goth, such as "google"
	Name   string `json:"name"` // Provider display name, such as "Google"
	GothID string `json:"-"`    // ID of the corresponding goth provider
}

// ---------------------------------------------------------------------------------------------------------------------

// IdentityProviderMap maps known IdPs to their enabled state. Need to create a dedicated type to address go-swagger
// limitations
type IdentityProviderMap map[string]bool

// Validate is required by go-openapi
func (m IdentityProviderMap) Validate(strfmt.Registry) error {
	return nil
}

// ContextValidate is required by go-openapi
func (m IdentityProviderMap) ContextValidate(context.Context, strfmt.Registry) error {
	return nil
}

// Clone returns a copy of this map
func (m IdentityProviderMap) Clone() IdentityProviderMap {
	r := make(IdentityProviderMap)
	for key, val := range m {
		r[key] = val
	}
	return r
}
