package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_owner"
	"gitlab.com/comentario/comentario/internal/data"
)

// ConfigClientGet returns client config
func ConfigClientGet(api_owner.ConfigClientGetParams) middleware.Responder {
	// Prepare a slice of IdPs
	var idps []*exmodels.FederatedIdProviderInfo
	for _, idp := range data.FederatedIdProviders {
		idp := idp // Make an in-loop copy
		idps = append(idps, &idp)
	}

	// Succeeded
	return api_owner.NewConfigClientGetOK().WithPayload(&models.ClientConfig{Idps: idps})
}
