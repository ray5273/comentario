package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/v3/internal/api/restapi/operations/api_embed"
	"gitlab.com/comentario/comentario/v3/internal/data"
	"gitlab.com/comentario/comentario/v3/internal/svc"
)

func EmbedPageUpdate(params api_embed.EmbedPageUpdateParams, user *data.User) middleware.Responder {
	// Fetch the page and the domain user
	page, _, domainUser, r := domainPageGetDomainUser(params.UUID, user)
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
		if err := svc.ThePageService.Update(page.WithIsReadonly(ro)); err != nil {
			return respServiceError(err)
		}
	}

	// Succeeded
	return api_embed.NewEmbedPageUpdateNoContent()
}
