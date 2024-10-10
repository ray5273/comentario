package exmodels

import (
	"context"
	"github.com/go-openapi/strfmt"
)

// validationStub is a noop Validatable/ContextValidatable implementation, mostly meant for readonly DTOs
type validationStub struct{}

func (s *validationStub) Validate(strfmt.Registry) error                         { return nil }
func (s *validationStub) ContextValidate(context.Context, strfmt.Registry) error { return nil }

// ---------------------------------------------------------------------------------------------------------------------

// KeyValueMap represents a typed string-to-string map used
type KeyValueMap map[string]string

// Validate is a part of interfaces.Validatable implementation
func (m KeyValueMap) Validate(strfmt.Registry) error { return nil }

// ContextValidate is a part of interfaces.ContextValidatable implementation
func (m KeyValueMap) ContextValidate(context.Context, strfmt.Registry) error { return nil }

// ---------------------------------------------------------------------------------------------------------------------

type StatsDimensionItem struct {
	validationStub
	Count   uint64 `json:"count"   db:"cnt"`
	Element string `json:"element" db:"el"`
}

// ---------------------------------------------------------------------------------------------------------------------

type StatsDimensionCounts []StatsDimensionItem

// Validate is a part of interfaces.Validatable implementation
func (s StatsDimensionCounts) Validate(strfmt.Registry) error { return nil }

// ContextValidate is a part of interfaces.ContextValidatable implementation
func (s StatsDimensionCounts) ContextValidate(context.Context, strfmt.Registry) error { return nil }
