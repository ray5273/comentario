package data

import (
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"time"
)

// DynConfigItemKey is a dynamic configuration item key
type DynConfigItemKey string

// DynConfigItemDatatype is a dynamic configuration item datatype
type DynConfigItemDatatype string

// DynConfigItem describes a single dynamic configuration entry (key-value pair, with a default value and metadata)
type DynConfigItem struct {
	Value        string                // Item value
	Datatype     DynConfigItemDatatype // Item datatype
	UpdatedTime  time.Time             // Timestamp when the item was last updated in the database
	UserUpdated  uuid.NullUUID         // Reference to the user who last updated the item in the database
	DefaultValue string                // Item's default value
}

// AsBool returns the value converted to a boolean
func (ci *DynConfigItem) AsBool() bool {
	return ci.Value == "true"
}

// HasDefaultValue returns true if the item has its default value
func (ci *DynConfigItem) HasDefaultValue() bool {
	return ci.Value == ci.DefaultValue
}

// ToDTO converts this model into an API model
func (ci *DynConfigItem) ToDTO(key DynConfigItemKey) *models.DynamicConfigItem {
	return &models.DynamicConfigItem{
		Datatype:     models.DynamicConfigItemDatatype(ci.Datatype),
		DefaultValue: ci.DefaultValue,
		Key:          swag.String(string(key)),
		UpdatedTime:  strfmt.DateTime(ci.UpdatedTime),
		UserUpdated:  strfmt.UUID(ci.UserUpdated.UUID.String()),
		Value:        swag.String(ci.Value),
	}
}

const (
	ConfigDatatypeBoolean DynConfigItemDatatype = "boolean"
)

const (
	ConfigKeyDomainDefaultsPrefix = "domain.defaults."
)

const (
	ConfigKeyAuthSignupConfirmCommenter             DynConfigItemKey = "auth.signup.confirm.commenter"
	ConfigKeyAuthSignupConfirmUser                  DynConfigItemKey = "auth.signup.confirm.user"
	ConfigKeyAuthSignupEnabled                      DynConfigItemKey = "auth.signup.enabled"
	ConfigKeyDomainDefaultsCommentDeletionAuthor    DynConfigItemKey = "domain.defaults.comments.deletion.author"
	ConfigKeyDomainDefaultsCommentDeletionModerator DynConfigItemKey = "domain.defaults.comments.deletion.moderator"
	ConfigKeyDomainDefaultsCommentEditingAuthor     DynConfigItemKey = "domain.defaults.comments.editing.author"
	ConfigKeyDomainDefaultsCommentEditingModerator  DynConfigItemKey = "domain.defaults.comments.editing.moderator"
	ConfigKeyDomainDefaultsEnableCommentVoting      DynConfigItemKey = "domain.defaults.comments.enableVoting"
	ConfigKeyDomainDefaultsShowDeletedComments      DynConfigItemKey = "domain.defaults.comments.showDeleted"
	ConfigKeyDomainDefaultsLocalSignupEnabled       DynConfigItemKey = "domain.defaults.signup.enableLocal"
	ConfigKeyDomainDefaultsFederatedSignupEnabled   DynConfigItemKey = "domain.defaults.signup.enableFederated"
	ConfigKeyDomainDefaultsSsoSignupEnabled         DynConfigItemKey = "domain.defaults.signup.enableSso"
	ConfigKeyIntegrationsUseGravatar                DynConfigItemKey = "integrations.useGravatar"
	ConfigKeyMarkdownImagesEnabled                  DynConfigItemKey = "markdown.images.enabled"
	ConfigKeyMarkdownLinksEnabled                   DynConfigItemKey = "markdown.links.enabled"
	ConfigKeyMarkdownTablesEnabled                  DynConfigItemKey = "markdown.tables.enabled"
	ConfigKeyOperationNewOwnerEnabled               DynConfigItemKey = "operation.newOwner.enabled"
)

// DefaultDynInstanceConfig is the default dynamic instance configuration
var DefaultDynInstanceConfig = map[DynConfigItemKey]*DynConfigItem{
	ConfigKeyAuthSignupConfirmCommenter:             {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyAuthSignupConfirmUser:                  {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyAuthSignupEnabled:                      {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsCommentDeletionAuthor:    {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsCommentDeletionModerator: {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsCommentEditingAuthor:     {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsCommentEditingModerator:  {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsEnableCommentVoting:      {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsShowDeletedComments:      {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsLocalSignupEnabled:       {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsFederatedSignupEnabled:   {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsSsoSignupEnabled:         {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyIntegrationsUseGravatar:                {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyMarkdownImagesEnabled:                  {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyMarkdownLinksEnabled:                   {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyMarkdownTablesEnabled:                  {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyOperationNewOwnerEnabled:               {DefaultValue: "false", Datatype: ConfigDatatypeBoolean},
}
