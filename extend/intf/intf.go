// Base Comentario interfaces
// WARNING: unstable API

package intf

import (
	"github.com/google/uuid"
)

// Tx is a transaction
type Tx interface {
	// Commit the running transaction
	Commit() error
	// Rollback the running transaction
	Rollback() error
}

// User represents an authenticated or an anonymous user
type User struct {
	ID          uuid.UUID // Unique user ID
	Email       string    // Unique user email
	Name        string    // User's full name
	LangID      string    // User's interface language ID
	IsSuperuser bool      // Whether the user is a superuser
	Confirmed   bool      // Whether the user's email has been confirmed
	Banned      bool      // Whether the user is banned
	IsLocked    bool      // Whether the user is locked out
}

// AttrValues is a key-indexed value map
type AttrValues = map[string]string

// AttrStore allows to store and retrieve attributes consisting of a string key and a string value
type AttrStore interface {
	// FindByAttrValue finds and returns owner IDs that have the given attribute key-value pair
	FindByAttrValue(key, value string) ([]uuid.UUID, error)
	// GetAll returns all attributes of an owner with the given ID
	GetAll(ownerID *uuid.UUID) (AttrValues, error)
	// Set given attribute values for the given owner by key
	Set(ownerID *uuid.UUID, attr AttrValues) error
}

// UserStore allows to retrieve Comentario users
type UserStore interface {
	// FindUserByID finds and returns a user by the given user ID
	FindUserByID(id *uuid.UUID) (*User, error)
}

// YAMLDecoder allows for unmarshalling configuration into a user-defined structure, which provides `yaml` metadata
type YAMLDecoder interface {
	Decode(target any) error
}
