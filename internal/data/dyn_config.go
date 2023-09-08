package data

import (
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"time"
)

// DynInstanceConfigItemKey is a dynamic configuration item key
type DynInstanceConfigItemKey string

// DynInstanceConfigItemDatatype is a dynamic configuration item datatype
type DynInstanceConfigItemDatatype string

// DynInstanceConfigItem describes a single dynamic configuration entry (key-value pair)
type DynInstanceConfigItem struct {
	Value        string                        // Item value
	Description  string                        // Item description
	Datatype     DynInstanceConfigItemDatatype // Item datatype
	UpdatedTime  time.Time                     // Timestamp when the item was last updated in the database
	UserUpdated  uuid.NullUUID                 // Reference to the user who last updated the item in the database
	DefaultValue string                        // Item's default value
}

// AsBool returns the value converted to a boolean
func (ci *DynInstanceConfigItem) AsBool() bool {
	return ci.Value == "true"
}

// HasDefaultValue returns true if the item has its default value
func (ci *DynInstanceConfigItem) HasDefaultValue() bool {
	return ci.Value == ci.DefaultValue
}

// ToDTO converts this model into an API model
func (ci *DynInstanceConfigItem) ToDTO(key DynInstanceConfigItemKey) *models.InstanceDynamicConfigItem {
	return &models.InstanceDynamicConfigItem{
		Datatype:     models.InstanceDynamicConfigItemDatatype(ci.Datatype),
		DefaultValue: ci.DefaultValue,
		Description:  ci.Description,
		Key:          swag.String(string(key)),
		UpdatedTime:  strfmt.DateTime(ci.UpdatedTime),
		UserUpdated:  strfmt.UUID(ci.UserUpdated.UUID.String()),
		Value:        swag.String(ci.Value),
	}
}

const (
	ConfigDatatypeBoolean DynInstanceConfigItemDatatype = "boolean"
)

const (
	ConfigKeyAuthSignupEnabled          DynInstanceConfigItemKey = "auth.signup.enabled"
	ConfigKeyAuthSignupConfirmCommenter DynInstanceConfigItemKey = "auth.signup.confirm.commenter"
	ConfigKeyAuthSignupConfirmUser      DynInstanceConfigItemKey = "auth.signup.confirm.user"
	ConfigKeyOperationNewOwnerEnabled   DynInstanceConfigItemKey = "operation.newOwner.enabled"
	ConfigKeyMarkdownLinksEnabled       DynInstanceConfigItemKey = "markdown.links.enabled"
	ConfigKeyMarkdownImagesEnabled      DynInstanceConfigItemKey = "markdown.images.enabled"
)

// DefaultDynInstanceConfig is the default dynamic instance configuration
var DefaultDynInstanceConfig = map[DynInstanceConfigItemKey]*DynInstanceConfigItem{
	ConfigKeyAuthSignupEnabled:          {DefaultValue: "true", Datatype: ConfigDatatypeBoolean, Description: "Enable registration of new users"},
	ConfigKeyAuthSignupConfirmUser:      {DefaultValue: "true", Datatype: ConfigDatatypeBoolean, Description: "New users must confirm their email"},
	ConfigKeyAuthSignupConfirmCommenter: {DefaultValue: "true", Datatype: ConfigDatatypeBoolean, Description: "New commenters must confirm their email"},
	ConfigKeyOperationNewOwnerEnabled:   {DefaultValue: "false", Datatype: ConfigDatatypeBoolean, Description: "Non-owner users can add domains"},
	ConfigKeyMarkdownLinksEnabled:       {DefaultValue: "true", Datatype: ConfigDatatypeBoolean, Description: "Enable links in comments"},
	ConfigKeyMarkdownImagesEnabled:      {DefaultValue: "true", Datatype: ConfigDatatypeBoolean, Description: "Enable images in comments"},
}
