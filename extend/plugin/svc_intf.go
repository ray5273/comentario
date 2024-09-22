// Declaration of service interfaces relevant for plugins

package plugin

import "github.com/google/uuid"

// UserAttrService is a service interface for dealing with user attributes
type UserAttrService interface {
	// GetAll returns all attributes of a user with the given ID
	GetAll(userID *uuid.UUID) (map[string]string, error)
	// Set an attribute value for the given user by the attribute name
	Set(userID *uuid.UUID, key, value string) error
}

// DomainAttrService is a service interface for dealing with domain attributes
type DomainAttrService interface {
	// GetAll returns all attributes of a domain with the given ID
	GetAll(domainID *uuid.UUID) (map[string]string, error)
	// Set an attribute value for the given domain by the attribute name
	Set(domainID *uuid.UUID, key, value string) error
}
