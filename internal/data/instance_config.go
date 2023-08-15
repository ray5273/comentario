package data

import (
	"github.com/google/uuid"
	"time"
)

// InstanceConfigItemKey is a configuration item key
type InstanceConfigItemKey string

// InstanceConfigItemDatatype is a configuration item datatype
type InstanceConfigItemDatatype string

// InstanceConfigItem describes a single configuration entry (key-value pair)
type InstanceConfigItem struct {
	Value        string                     // Item value
	Description  string                     // Item description
	Datatype     InstanceConfigItemDatatype // Item datatype
	UpdatedTime  time.Time                  // Timestamp when the item was last updated in the database
	UserUpdated  uuid.NullUUID              // Reference to the user who last updated the item in the database
	DefaultValue string                     // Item's default value
}

// AsBool returns the value converted to a boolean
func (ci *InstanceConfigItem) AsBool() bool {
	return ci.Value == "true"
}

// HasDefaultValue returns true if the item has its default value
func (ci *InstanceConfigItem) HasDefaultValue() bool {
	return ci.Value == ci.DefaultValue
}

const (
	ConfigDatatypeBoolean InstanceConfigItemDatatype = "boolean"
)

const (
	ConfigKeyAuthSignupConfirmUser      InstanceConfigItemKey = "auth.signup.confirm.user"
	ConfigKeyAuthSignupConfirmCommenter InstanceConfigItemKey = "auth.signup.confirm.commenter"
)
