package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/markbates/goth"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_generic"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"sort"
)

// ConfigClientGet returns client config
func ConfigClientGet(api_generic.ConfigClientGetParams) middleware.Responder {
	// Prepare a slice of IdP IDs
	var idps []*models.IdentityProvider
	for _, fidp := range data.FederatedIdProviders {
		// If the provider is configured, add it to the slice
		if _, err := goth.GetProvider(fidp.GothID); err == nil {
			idps = append(idps, &fidp.IdentityProvider)
		}
	}

	// Sort the providers by ID for a stable ordering
	sort.Slice(idps, func(i, j int) bool {
		return idps[i].ID < idps[j].ID
	})

	// Succeeded
	return api_generic.NewConfigClientGetOK().WithPayload(&models.ClientConfig{
		BaseURL:       config.BaseURL.String(),
		Idps:          idps,
		SignupAllowed: config.CLIFlags.AllowNewOwners,
	})
}
