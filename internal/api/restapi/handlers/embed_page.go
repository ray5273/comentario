package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_embed"
	"gitlab.com/comentario/comentario/internal/data"
)

func EmbedPageUpdate(params api_embed.EmbedPageUpdateParams, user *data.User) middleware.Responder {
	// Fetch the page and the domain user
	page, domain, domainUser, r := domainPageGetDomainUser(params.UUID, user)
	if r != nil {
		return r
	}

	// Make sure the user is allowed to moderate page
	if r := Verifier.UserCanModerateDomain(user, domainUser); r != nil {
		return r
	}

	// Update the page properties, if necessary
	ro := swag.BoolValue(params.Body.IsReadonly)
	if page.IsReadonly != ro {
		if r := domainPageUpdateFetchTitle(domain, page.WithIsReadonly(ro)); r != nil {
			return r
		}
	}

	// Succeeded
	return api_embed.NewEmbedPageUpdateNoContent()
}
