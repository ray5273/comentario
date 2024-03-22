package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"golang.org/x/text/language/display"
	"sort"
	"time"
)

func ConfigDynamicReset(_ api_general.ConfigDynamicResetParams, user *data.User) middleware.Responder {
	// Verify the user is a superuser
	if r := Verifier.UserIsSuperuser(user); r != nil {
		return r
	}

	// Reset the config
	if err := svc.TheDynConfigService.Reset(); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewConfigDynamicResetNoContent()
}

func ConfigDynamicUpdate(params api_general.ConfigDynamicUpdateParams, user *data.User) middleware.Responder {
	// Verify the user is a superuser
	if r := Verifier.UserIsSuperuser(user); r != nil {
		return r
	}

	// Iterate the params and create a key-value map
	vals := map[data.DynConfigItemKey]string{}
	for _, item := range params.Body {
		vals[data.DynConfigItemKey(swag.StringValue(item.Key))] = swag.StringValue(item.Value)
	}

	// Update the config
	if err := svc.TheDynConfigService.Update(&user.ID, vals); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewConfigDynamicUpdateNoContent()
}

func ConfigExtensionsGet(api_general.ConfigExtensionsGetParams, *data.User) middleware.Responder {
	// Make a list of enabled extensions
	var dtos []*models.DomainExtension
	for _, de := range data.DomainExtensions {
		if de.Enabled {
			dtos = append(dtos, de.ToDTO())
		}
	}

	// Sort the extensions by ID for a stable ordering
	sort.Slice(dtos, func(i, j int) bool { return dtos[i].ID < dtos[j].ID })

	// Succeeded
	return api_general.NewConfigExtensionsGetOK().WithPayload(&api_general.ConfigExtensionsGetOKBody{
		Extensions: dtos,
	})
}

func ConfigGet(api_general.ConfigGetParams) middleware.Responder {
	// Prepare a slice of IdP IDs
	var idps []*models.FederatedIdentityProvider
	for fid, fidp := range data.FederatedIdProviders {
		// If the provider is configured, add it to the slice
		if _, ok, _, _ := data.GetFederatedIdP(fid); ok {
			idps = append(idps, fidp.ToDTO())
		}
	}

	// Sort the providers by ID for a stable ordering
	sort.Slice(idps, func(i, j int) bool {
		return idps[i].ID < idps[j].ID
	})

	// Prepare a languages slice
	var langs []*models.UILanguage
	for _, t := range svc.TheI18nService.LangTags() {
		langs = append(langs, &models.UILanguage{
			ID:                 t.String(),
			NameEnglish:        display.English.Languages().Name(t),
			NameNative:         display.Self.Name(t),
			IsFrontendLanguage: svc.TheI18nService.IsFrontendTag(t),
		})
	}

	// Fetch dynamic config
	dynConfig, err := svc.TheDynConfigService.GetAll()
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewConfigGetOK().
		WithPayload(&api_general.ConfigGetOKBody{
			DynamicConfig: dynConfigToDTOs(dynConfig),
			StaticConfig: &models.InstanceStaticConfig{
				BaseDocsURL:       config.CLIFlags.BaseDocsURL,
				BaseURL:           config.BaseURL.String(),
				BuildDate:         strfmt.DateTime(config.BuildDate),
				DbVersion:         svc.TheServiceManager.DBVersion(),
				DefaultLangID:     util.DefaultLanguage.String(),
				FederatedIdps:     idps,
				HomeContentURL:    strfmt.URI(config.CLIFlags.HomeContentURL),
				LiveUpdateEnabled: svc.TheWebSocketsService.Active(),
				PrivacyPolicyURL:  config.PrivacyPolicyURL,
				ResultPageSize:    util.ResultPageSize,
				ServerTime:        strfmt.DateTime(time.Now().UTC()),
				TermsOfServiceURL: config.TermsOfServiceURL,
				UILanguages:       langs,
				Version:           config.AppVersion,
			},
		})
}

// dynConfigToDTOs converts a map of dynamic config items into a slice of DTO models
func dynConfigToDTOs(config map[data.DynConfigItemKey]*data.DynConfigItem) []*models.DynamicConfigItem {
	result := make([]*models.DynamicConfigItem, 0, len(config))
	for key, item := range config {
		result = append(result, item.ToDTO(key))
	}
	return result
}
