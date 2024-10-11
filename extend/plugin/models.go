// Models used to interact plugins.
// WARNING: unstable API

package plugin

import (
	"github.com/google/uuid"
)

// Principal represents an authenticated user
type Principal struct {
	ID    uuid.UUID // Unique user ID
	Email string    // Unique user email
	Name  string    // User's full name
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
