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

// Instance (global) settings
const (
	ConfigKeyAuthSignupConfirmCommenter DynConfigItemKey = "auth.signup.confirm.commenter"
	ConfigKeyAuthSignupConfirmUser      DynConfigItemKey = "auth.signup.confirm.user"
	ConfigKeyAuthSignupEnabled          DynConfigItemKey = "auth.signup.enabled"
	ConfigKeyIntegrationsUseGravatar    DynConfigItemKey = "integrations.useGravatar"
	ConfigKeyOperationNewOwnerEnabled   DynConfigItemKey = "operation.newOwner.enabled"
)

// Domain settings
const (
	DomainConfigKeyCommentDeletionAuthor    DynConfigItemKey = "comments.deletion.author"
	DomainConfigKeyCommentDeletionModerator DynConfigItemKey = "comments.deletion.moderator"
	DomainConfigKeyCommentEditingAuthor     DynConfigItemKey = "comments.editing.author"
	DomainConfigKeyCommentEditingModerator  DynConfigItemKey = "comments.editing.moderator"
	DomainConfigKeyEnableCommentVoting      DynConfigItemKey = "comments.enableVoting"
	DomainConfigKeyShowDeletedComments      DynConfigItemKey = "comments.showDeleted"
	DomainConfigKeyMarkdownImagesEnabled    DynConfigItemKey = "markdown.images.enabled"
	DomainConfigKeyMarkdownLinksEnabled     DynConfigItemKey = "markdown.links.enabled"
	DomainConfigKeyMarkdownTablesEnabled    DynConfigItemKey = "markdown.tables.enabled"
	DomainConfigKeyLocalSignupEnabled       DynConfigItemKey = "signup.enableLocal"
	DomainConfigKeyFederatedSignupEnabled   DynConfigItemKey = "signup.enableFederated"
	DomainConfigKeySsoSignupEnabled         DynConfigItemKey = "signup.enableSso"
)

// ConfigKeyDomainDefaultsPrefix is a prefix given to domain setting keys that turn them into global domain defaults keys
const ConfigKeyDomainDefaultsPrefix = "domain.defaults."

// DefaultDynInstanceConfig is the default dynamic instance configuration
var DefaultDynInstanceConfig = map[DynConfigItemKey]*DynConfigItem{
	ConfigKeyAuthSignupConfirmCommenter:                                     {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyAuthSignupConfirmUser:                                          {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyAuthSignupEnabled:                                              {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyIntegrationsUseGravatar:                                        {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyOperationNewOwnerEnabled:                                       {DefaultValue: "false", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyCommentDeletionAuthor:    {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyCommentDeletionModerator: {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyCommentEditingAuthor:     {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyCommentEditingModerator:  {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyEnableCommentVoting:      {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyShowDeletedComments:      {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyMarkdownImagesEnabled:    {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyMarkdownLinksEnabled:     {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyMarkdownTablesEnabled:    {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyLocalSignupEnabled:       {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyFederatedSignupEnabled:   {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeySsoSignupEnabled:         {DefaultValue: "true", Datatype: ConfigDatatypeBoolean},
}
