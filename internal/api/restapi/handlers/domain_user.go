package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
)

func DomainUserList(params api_general.DomainUserListParams, user *data.User) middleware.Responder {
	// Find the domain and verify the user's privileges
	domain, _, r := domainGetWithUser(params.Domain, user, true)
	if r != nil {
		return r
	}

	// Fetch domain users and corresponding users
	us, dus, err := svc.TheUserService.ListByDomain(
		&domain.ID,
		user.IsSuperuser,
		swag.StringValue(params.Filter),
		swag.StringValue(params.SortBy),
		data.SortDirection(swag.BoolValue(params.SortDesc)),
		int(swag.Uint64Value(params.Page)-1))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDomainUserListOK().
		WithPayload(&api_general.DomainUserListOKBody{
			DomainUsers: data.SliceToDTOs[*data.DomainUser, *models.DomainUser](dus),
			Users:       data.SliceToDTOs[*data.User, *models.User](us),
		})
}
