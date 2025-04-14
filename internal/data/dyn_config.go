package data

import (
	"fmt"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"strconv"
	"time"
)

// DynConfigItemSectionKey is a key of dynamic configuration item section
type DynConfigItemSectionKey string

// DynConfigItemKey is a dynamic configuration item key
type DynConfigItemKey string

// DynConfigItemDatatype is a dynamic configuration item datatype
type DynConfigItemDatatype string

// DynConfigItem describes a single dynamic configuration entry (key-value pair, with a default value and metadata)
type DynConfigItem struct {
	Value        string                  // Item value
	Datatype     DynConfigItemDatatype   // Item datatype
	UpdatedTime  time.Time               // Timestamp when the item was last updated in the database
	UserUpdated  uuid.NullUUID           // Reference to the user who last updated the item in the database
	DefaultValue string                  // Item's default value
	Section      DynConfigItemSectionKey // Key of the section the item belongs to
	Min          int                     // Minimum allowed value of the setting
	Max          int                     // Maximum allowed value of the setting
}

// AsBool returns the value converted to a boolean
func (ci *DynConfigItem) AsBool() bool {
	return ci.Value == "true"
}

// AsInt returns the value converted to an int
func (ci *DynConfigItem) AsInt() int {
	// Use the converted numeric value if it's valid
	i, err := strconv.Atoi(ci.Value)

	// Use the converted default value if the value is invalid
	if err != nil {
		i, err = strconv.Atoi(ci.DefaultValue)
	}

	// Fall back to the min value in case of error, otherwise enforce the allowed range
	if err != nil {
		i = ci.Min
	} else if i < ci.Min {
		i = ci.Min
	} else if i > ci.Max {
		i = ci.Max
	}
	return i
}

// ToDTO converts this model into an API model
func (ci *DynConfigItem) ToDTO(key DynConfigItemKey) *models.DynamicConfigItem {
	return &models.DynamicConfigItem{
		Datatype:     models.DynamicConfigItemDatatype(ci.Datatype),
		DefaultValue: ci.DefaultValue,
		Key:          swag.String(string(key)),
		Section:      string(ci.Section),
		UpdatedTime:  strfmt.DateTime(ci.UpdatedTime),
		UserUpdated:  strfmt.UUID(ci.UserUpdated.UUID.String()),
		Value:        swag.String(ci.Value),
		Min:          int64(ci.Min),
		Max:          int64(ci.Max),
	}
}

// ValidateValue validates the given value for this item
func (ci *DynConfigItem) ValidateValue(value string) error {
	// Validate value length
	if len(value) > 255 {
		return fmt.Errorf("value too long (%d chars, 255 allowed): %q", len(value), value)
	}

	// Validate according to the datatype
	switch ci.Datatype {
	case ConfigDatatypeBool:
		if value != "false" && value != "true" {
			return fmt.Errorf("invalid bool item value (%q)", value)
		}
	case ConfigDatatypeInt:
		if i, err := strconv.Atoi(value); err != nil {
			return fmt.Errorf("invalid int item value (%q): %w", value, err)
		} else if i < ci.Min {
			return fmt.Errorf("int item value (%d) is less than allowed minimum (%d)", i, ci.Min)
		} else if i > ci.Max {
			return fmt.Errorf("int item value (%d) is greater than allowed maximum (%d)", i, ci.Max)
		}
	}
	return nil
}

//----------------------------------------------------------------------------------------------------------------------

// DynConfigMap is a key-indexed map of DynConfigItem
type DynConfigMap map[DynConfigItemKey]*DynConfigItem

// Clone the map
func (m DynConfigMap) Clone() DynConfigMap {
	c := make(DynConfigMap, len(m))
	for k, v := range m {
		vCopy := *v
		c[k] = &vCopy
	}
	return c
}

// GetBool returns the bool value of a configuration item by its key, or false on error
func (m DynConfigMap) GetBool(key DynConfigItemKey) bool {
	if i, ok := m[key]; ok {
		return i.AsBool()
	}
	return false
}

// GetInt returns the bool value of a configuration item by its key, or -1 on error
func (m DynConfigMap) GetInt(key DynConfigItemKey) int {
	if i, ok := m[key]; ok {
		return i.AsInt()
	}
	return -1
}

// ToDTO converts a key-value map of dynamic config items into a slice of DTO models
func (m DynConfigMap) ToDTO() []*models.DynamicConfigItem {
	result := make([]*models.DynamicConfigItem, 0, len(m))
	for key, item := range m {
		result = append(result, item.ToDTO(key))
	}
	return result

}

//----------------------------------------------------------------------------------------------------------------------

// DynConfigDTOsToMap converts a slice of dynamic config item DTOs into a key-value map
func DynConfigDTOsToMap(items []*models.DynamicConfigItem) map[DynConfigItemKey]string {
	m := make(map[DynConfigItemKey]string, len(items))
	for _, item := range items {
		m[DynConfigItemKey(swag.StringValue(item.Key))] = swag.StringValue(item.Value)
	}
	return m
}

const (
	ConfigDatatypeBool DynConfigItemDatatype = "bool"
	ConfigDatatypeInt  DynConfigItemDatatype = "int"
)

// Item section keys
const (
	DynConfigItemSectionAuth         DynConfigItemSectionKey = "auth"
	DynConfigItemSectionComments     DynConfigItemSectionKey = "comments"
	DynConfigItemSectionIntegrations DynConfigItemSectionKey = "integrations"
	DynConfigItemSectionMarkdown     DynConfigItemSectionKey = "markdown"
	DynConfigItemSectionMisc         DynConfigItemSectionKey = "misc"
)

// Instance (global) settings
const (
	ConfigKeyAuthEmailUpdateEnabled     DynConfigItemKey = "auth.emailUpdate.enabled"
	ConfigKeyAuthLoginLocalMaxAttempts  DynConfigItemKey = "auth.login.local.maxAttempts"
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
	DomainConfigKeyRSSEnabled               DynConfigItemKey = "comments.rss.enabled"
	DomainConfigKeyShowDeletedComments      DynConfigItemKey = "comments.showDeleted"
	DomainConfigKeyMaxCommentLength         DynConfigItemKey = "comments.text.maxLength"
	DomainConfigKeyMarkdownImagesEnabled    DynConfigItemKey = "markdown.images.enabled"
	DomainConfigKeyMarkdownLinksEnabled     DynConfigItemKey = "markdown.links.enabled"
	DomainConfigKeyMarkdownTablesEnabled    DynConfigItemKey = "markdown.tables.enabled"
	DomainConfigKeyShowLoginForUnauth       DynConfigItemKey = "login.showForUnauth"
	DomainConfigKeyLocalSignupEnabled       DynConfigItemKey = "signup.enableLocal"
	DomainConfigKeyFederatedSignupEnabled   DynConfigItemKey = "signup.enableFederated"
	DomainConfigKeySsoSignupEnabled         DynConfigItemKey = "signup.enableSso"
)

// ConfigKeyDomainDefaultsPrefix is a prefix given to domain setting keys that turn them into global domain defaults keys
const ConfigKeyDomainDefaultsPrefix = "domain.defaults."

// DefaultDynInstanceConfig is the default dynamic instance configuration
var DefaultDynInstanceConfig = DynConfigMap{
	ConfigKeyAuthEmailUpdateEnabled:                                         {DefaultValue: "false", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionAuth},
	ConfigKeyAuthLoginLocalMaxAttempts:                                      {DefaultValue: "10", Datatype: ConfigDatatypeInt, Section: DynConfigItemSectionAuth, Min: 0, Max: 1<<31 - 1},
	ConfigKeyAuthSignupConfirmCommenter:                                     {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionAuth},
	ConfigKeyAuthSignupConfirmUser:                                          {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionAuth},
	ConfigKeyAuthSignupEnabled:                                              {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionAuth},
	ConfigKeyIntegrationsUseGravatar:                                        {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionIntegrations},
	ConfigKeyOperationNewOwnerEnabled:                                       {DefaultValue: "false", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionMisc},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyCommentDeletionAuthor:    {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionComments},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyCommentDeletionModerator: {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionComments},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyCommentEditingAuthor:     {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionComments},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyCommentEditingModerator:  {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionComments},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyEnableCommentVoting:      {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionComments},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyRSSEnabled:               {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionComments},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyShowDeletedComments:      {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionComments},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyMaxCommentLength:         {DefaultValue: "4096", Datatype: ConfigDatatypeInt, Section: DynConfigItemSectionComments, Min: 140, Max: 1048576},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyMarkdownImagesEnabled:    {DefaultValue: "false", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionMarkdown},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyMarkdownLinksEnabled:     {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionMarkdown},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyMarkdownTablesEnabled:    {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionMarkdown},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyShowLoginForUnauth:       {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionAuth},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyLocalSignupEnabled:       {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionAuth},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeyFederatedSignupEnabled:   {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionAuth},
	ConfigKeyDomainDefaultsPrefix + DomainConfigKeySsoSignupEnabled:         {DefaultValue: "true", Datatype: ConfigDatatypeBool, Section: DynConfigItemSectionAuth},
}
