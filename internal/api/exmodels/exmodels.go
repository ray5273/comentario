package exmodels

import (
	"context"
	"github.com/go-openapi/strfmt"
	"github.com/google/uuid"
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

// StatsDimensionItem is an element name (string) coupled with a count
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

// ---------------------------------------------------------------------------------------------------------------------

// PageStatsItem contains a domain page reference coupled with a count
type PageStatsItem struct {
	validationStub
	DomainID   uuid.UUID `json:"domainId"   db:"domain_id"`   // ID of the domain
	DomainHost string    `json:"domainHost" db:"domain_host"` // Host of the domain
	ID         uuid.UUID `json:"id"         db:"id"`          // Unique record ID
	Path       string    `json:"path"       db:"path"`        // Page path
	Title      string    `json:"title"      db:"title"`       // Page title
	Count      int64     `json:"count"      db:"cnt"`         // Count of related elements on the page (views/comments)
}
