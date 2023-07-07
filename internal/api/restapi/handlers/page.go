package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
)

func DomainPageList(params api_general.DomainPageListParams, user *data.User) middleware.Responder {
	// Extract domain ID
	domainID, err := data.DecodeUUID(params.Domain)
	if err != nil {
		return respBadRequest(ErrorInvalidUUID)
	}

	// Fetch pages the user has access to
	ps, err := svc.ThePageService.ListByDomainUser(
		&user.ID,
		domainID,
		user.IsSuperuser,
		swag.StringValue(params.Filter),
		swag.StringValue(params.SortBy),
		data.SortDirection(swag.BoolValue(params.SortDesc)),
		int(swag.Uint64Value(params.Page)-1))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDomainPageListOK().
		WithPayload(&api_general.DomainPageListOKBody{
			Pages: data.SliceToDTOs[*data.DomainPage, *models.DomainPage](ps),
		})
}

func DomainPageGet(params api_general.DomainPageGetParams, user *data.User) middleware.Responder {
	// Extract domain page ID
	pageID, err := data.DecodeUUID(params.UUID)
	if err != nil {
		return respBadRequest(ErrorInvalidUUID)
	}

	// Fetch page
	p, err := svc.ThePageService.FindByID(pageID)
	if err != nil {
		return respServiceError(err)
	}

	// Find the page's domain and user
	_, domainUser, err := svc.TheDomainService.FindDomainUserByID(&p.DomainID, &user.ID)
	if err != nil {
		return respServiceError(err)
	}

	// If no user record is present, the user isn't allowed to view the page at all (unless it's a superuser): respond
	// with Not Found as if the page doesn't exist
	if !user.IsSuperuser && domainUser == nil {
		return respNotFound(nil)

		// If the user isn't a superuser or domain owner, they're only allowed to view a limited set of page properties
	} else if !user.IsSuperuser && !domainUser.IsOwner {
		p = p.AsNonOwner()
	}

	// Succeeded
	return api_general.NewDomainPageGetOK().WithPayload(&api_general.DomainPageGetOKBody{Page: p.ToDTO()})
}
