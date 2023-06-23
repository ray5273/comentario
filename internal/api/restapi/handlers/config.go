package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"sort"
)

func ComentarioConfig(api_general.ComentarioConfigParams) middleware.Responder {
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

	// Succeeded
	return api_general.NewComentarioConfigOK().WithPayload(&models.ComentarioConfig{
		BaseURL:          config.BaseURL.String(),
		BuildDate:        strfmt.DateTime(config.BuildDate),
		FederatedIdps:    idps,
		NewOwnersAllowed: config.CLIFlags.AllowNewOwners,
		SignupAllowed:    config.CLIFlags.AllowSignups,
		Version:          config.AppVersion,
	})
}
