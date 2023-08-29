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
)

func ConfigDynamicGet(api_general.ConfigDynamicGetParams) middleware.Responder {
	items, err := svc.TheDynConfigService.GetAll()
	if err != nil {
		return respServiceError(err)
	}

	// Convert the map into a slice of DTO objects
	var dtos []*models.InstanceDynamicConfigItem
	for key, item := range items {
		dtos = append(dtos, item.ToDTO(key))
	}

	return api_general.NewConfigDynamicGetOK().WithPayload(dtos)
}

func ConfigDynamicReset(_ api_general.ConfigDynamicResetParams, user *data.User) middleware.Responder {
	// Verify the user is a superuser
	if r := Verifier.UserIsSuperuser(user); r != nil {
		return r
	}

	// Reset the config
	svc.TheDynConfigService.Reset()

	// Save the config
	if err := svc.TheDynConfigService.Save(); err != nil {
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

	// Iterate the params and update the config
	for _, item := range params.Body {
		err := svc.TheDynConfigService.Set(
			&user.ID,
			data.DynInstanceConfigItemKey(swag.StringValue(item.Key)),
			swag.StringValue(item.Value))
		if err != nil {
			return respServiceError(err)
		}
	}

	// Save the config
	if err := svc.TheDynConfigService.Save(); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewConfigDynamicUpdateNoContent()
}

func ConfigStaticGet(api_general.ConfigStaticGetParams) middleware.Responder {
	// Prepare a slice of IdP IDs
	var idps []*models.FederatedIdentityProvider
	for fid, fidp := range data.FederatedIdProviders {
		// If the provider is configured, add it to the slice
		if _, ok, _ := data.GetFederatedIdP(fid); ok {
			idps = append(idps, fidp.ToDTO())
		}
	}

	// Sort the providers by ID for a stable ordering
	sort.Slice(idps, func(i, j int) bool {
		return idps[i].ID < idps[j].ID
	})

	// Prepare a languages slice
	var langs []*models.UILanguage
	for _, l := range util.UILanguageTags {
		langs = append(langs, &models.UILanguage{
			ID:          l.String(),
			NameEnglish: display.English.Languages().Name(l),
			NameNative:  display.Self.Name(l),
		})
	}

	// Succeeded
	return api_general.NewConfigStaticGetOK().WithPayload(&models.InstanceStaticConfig{
		BaseDocsURL:    config.CLIFlags.BaseDocsURL,
		BaseURL:        config.BaseURL.String(),
		BuildDate:      strfmt.DateTime(config.BuildDate),
		DefaultLangID:  util.UIDefaultLangID,
		FederatedIdps:  idps,
		HomeContentURL: strfmt.URI(config.CLIFlags.HomeContentURL),
		ResultPageSize: util.ResultPageSize,
		UILanguages:    langs,
		Version:        config.AppVersion,
	})
}
