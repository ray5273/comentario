package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"gitlab.com/comentario/comentario/extend/plugin"
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

	// Update the config
	if err := svc.TheDynConfigService.Update(&user.ID, data.DynConfigDTOsToMap(params.Body)); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewConfigDynamicUpdateNoContent()
}

//goland:noinspection GoUnusedParameter
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

//goland:noinspection GoUnusedParameter
func ConfigGet(api_general.ConfigGetParams) middleware.Responder {
	// Prepare a slice of IdP IDs
	var idps []*models.FederatedIdentityProvider
	for fid, fidp := range config.FederatedIdProviders {
		// If the provider is configured, add it to the slice
		if _, ok, _, _ := config.GetFederatedIdP(fid); ok {
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

	// Convert plugin config into DTOs
	var pluginCfgs []*models.PluginConfig
	for id, cfg := range svc.ThePluginManager.PluginConfigs() {
		pluginCfgs = append(pluginCfgs, pluginConfigToDTO(id, cfg))
	}

	// Succeeded
	return api_general.NewConfigGetOK().
		WithPayload(&models.InstanceConfig{
			DynamicConfig: data.DynConfigMapToDTOs(dynConfig),
			PluginConfig:  &models.InstancePluginConfig{Plugins: pluginCfgs},
			StaticConfig: &models.InstanceStaticConfig{
				BaseDocsURL:          config.ServerConfig.BaseDocsURL,
				BaseURL:              config.ServerConfig.ParsedBaseURL().String(),
				BuildDate:            strfmt.DateTime(svc.TheVersionService.BuildDate()),
				DbVersion:            svc.TheVersionService.DBVersion(),
				DefaultLangID:        util.DefaultLanguage.String(),
				FederatedIdps:        idps,
				HomeContentURL:       strfmt.URI(config.ServerConfig.HomeContentURL),
				LiveUpdateEnabled:    svc.TheWebSocketsService.Active(),
				PageViewStatsEnabled: !config.ServerConfig.DisablePageViewStats,
				PrivacyPolicyURL:     config.ServerConfig.PrivacyPolicyURL,
				ResultPageSize:       util.ResultPageSize,
				ServerTime:           strfmt.DateTime(time.Now().UTC()),
				TermsOfServiceURL:    config.ServerConfig.TermsOfServiceURL,
				UILanguages:          langs,
				Version:              svc.TheVersionService.CurrentVersion(),
			},
		})
}

func ConfigVersionsGet(_ api_general.ConfigVersionsGetParams, user *data.User) middleware.Responder {
	// Verify the user is a superuser
	if r := Verifier.UserIsSuperuser(user); r != nil {
		return r
	}

	var rm *models.ReleaseMetadata
	if d := svc.TheVersionService.LatestRelease(); d != nil {
		rm = &models.ReleaseMetadata{
			Name:    d.Name(),
			PageURL: d.PageURL(),
			Version: d.Version(),
		}
	}

	// Succeeded
	return api_general.NewConfigVersionsGetOK().WithPayload(&api_general.ConfigVersionsGetOKBody{
		Current:       svc.TheVersionService.CurrentVersion(),
		IsUpgradable:  svc.TheVersionService.IsUpgradable(),
		LatestRelease: rm,
	})
}

// pluginConfigToDTO converts the given plugin config into a DTO model
func pluginConfigToDTO(id string, cfg *plugin.Config) *models.PluginConfig {
	// Convert plugs to DTOs
	var plugs []*models.PluginUIPlugConfig
	for _, p := range cfg.UIPlugs {
		// Convert the plug's labels into DTOs
		var labels []*models.PluginUILabel
		for _, l := range p.Labels {
			labels = append(labels, &models.PluginUILabel{Language: l.Language, Text: l.Text})
		}

		// Convert the plug itself into a DTO
		plugs = append(plugs, &models.PluginUIPlugConfig{
			ComponentTag: p.ComponentTag,
			Labels:       labels,
			Location:     string(p.Location),
			Path:         p.Path,
		})
	}

	// Convert resources to DTOs
	var resources []*models.PluginUIResourceConfig
	for _, r := range cfg.UIResources {
		resources = append(resources, &models.PluginUIResourceConfig{
			Rel:  r.Rel,
			Type: r.Type,
			URL:  r.URL,
		})
	}

	return &models.PluginConfig{
		ID:          id,
		Path:        cfg.Path,
		UIPlugs:     plugs,
		UIResources: resources,
	}
}
