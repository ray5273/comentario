package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_commenter"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
)

func PageUpdate(params api_commenter.PageUpdateParams, principal data.Principal) middleware.Responder {
	// Verify the commenter is authenticated
	if r := Verifier.PrincipalIsAuthenticated(principal); r != nil {
		return r
	}

	// Verify the user is a domain moderator
	page := params.Body.Page
	if r := Verifier.UserIsDomainModerator(principal.GetUser().Email, page.Host); r != nil {
		return r
	}

	// Insert or update the page
	if err := svc.ThePageService.UpsertByHostPath(page); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_commenter.NewPageUpdateNoContent()
}
