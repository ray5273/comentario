package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_generic"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
)

// ConfigClientGet returns client config
func ConfigClientGet(api_generic.ConfigClientGetParams) middleware.Responder {
	// Prepare a slice of IdPs
	var idps []*exmodels.IdentityProvider
	for _, idp := range data.FederatedIdProviders {
		idp := idp // Make an in-loop copy
		idps = append(idps, &idp)
	}

	// Succeeded
	return api_generic.NewConfigClientGetOK().WithPayload(&models.ClientConfig{
		BaseURL: config.BaseURL.String(),
		Idps:    idps,
	})
}
