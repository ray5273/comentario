package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_embed"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
)

func EmbedPageUpdate(params api_embed.EmbedPageUpdateParams, user *data.User) middleware.Responder {
	// Verify the user is authenticated
	if r := Verifier.UserIsAuthenticated(user); r != nil {
		return r
	}

	// Parse page ID
	if pageID, err := data.DecodeUUID(params.UUID); err != nil {
		return respBadRequest(ErrorInvalidUUID.WithDetails(string(params.UUID)))

		// Find the page
	} else if page, err := svc.ThePageService.FindByID(pageID); err != nil {
		return respServiceError(err)

		// Fetch the domain user
	} else if _, domainUser, err := svc.TheDomainService.FindDomainUserByID(&page.DomainID, &user.ID); err != nil {
		return respServiceError(err)

		// Verify the user is a domain moderator
	} else if r := Verifier.UserCanModerateDomain(user, domainUser); r != nil {
		return r

		// Update the page
	} else if err := svc.ThePageService.Update(page.WithIsReadonly(swag.BoolValue(params.Body.IsReadonly))); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_embed.NewEmbedPageUpdateNoContent()
}
