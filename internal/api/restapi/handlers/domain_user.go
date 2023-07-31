package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
)

func DomainUserGet(params api_general.DomainUserGetParams, user *data.User) middleware.Responder {
	// Find the domain user and the user
	if u, du, r := domainUserGet(params.Domain, params.UUID, user); r != nil {
		return r

	} else {
		// Succeeded
		return api_general.NewDomainUserGetOK().
			WithPayload(&api_general.DomainUserGetOKBody{DomainUser: du.ToDTO(), User: u.ToDTO()})
	}
}

func DomainUserList(params api_general.DomainUserListParams, user *data.User) middleware.Responder {
	// Find the domain and verify the user's privileges
	domain, _, r := domainGetWithUser(params.Domain, user, true)
	if r != nil {
		return r
	}

	// Fetch domain users and corresponding users
	um, dus, err := svc.TheUserService.ListByDomain(
		&domain.ID,
		user.IsSuperuser,
		swag.StringValue(params.Filter),
		swag.StringValue(params.SortBy),
		data.SortDirection(swag.BoolValue(params.SortDesc)),
		int(swag.Uint64Value(params.Page)-1))
	if err != nil {
		return respServiceError(err)
	}

	// Convert user map into a DTO slice
	us := make([]*models.User, 0, len(um))
	for _, u := range um {
		us = append(us, u.ToDTO())
	}

	// Succeeded
	return api_general.NewDomainUserListOK().
		WithPayload(&api_general.DomainUserListOKBody{
			DomainUsers: data.SliceToDTOs[*data.DomainUser, *models.DomainUser](dus),
			Users:       us,
		})
}

func DomainUserUpdate(params api_general.DomainUserUpdateParams, user *data.User) middleware.Responder {
	// Find the domain user
	_, du, r := domainUserGet(*params.Body.DomainID, params.UUID, user)
	if r != nil {
		return r
	}

	// Make sure the user isn't editing themselves
	if du.UserID == user.ID {
		return respForbidden(ErrorSelfEdit)
	}

	// Update the domain user
	du.IsOwner = params.Body.IsOwner
	du.IsModerator = du.IsOwner || params.Body.IsModerator
	du.IsCommenter = du.IsModerator || params.Body.IsCommenter
	if err := svc.TheDomainService.UserModify(du); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDomainUserUpdateNoContent()
}

// domainUserGet finds and returns the domain user and the user (cloned with proper clearance) by specified domain ID
// and user ID, verifying the user can manage the domain
func domainUserGet(domainID, userID strfmt.UUID, curUser *data.User) (*data.User, *data.DomainUser, middleware.Responder) {
	// Find the domain and verify the user's privileges
	if domain, curDU, r := domainGetWithUser(domainID, curUser, true); r != nil {
		return nil, nil, r

		// Parse user ID
	} else if uID, err := data.DecodeUUID(userID); err != nil {
		return nil, nil, respBadRequest(ErrorInvalidUUID.WithDetails(string(userID)))

		// Find the domain user
	} else if u, du, err := svc.TheUserService.FindDomainUserByID(uID, &domain.ID); err != nil {
		return nil, nil, respServiceError(err)

		// Make sure the domain user exists
	} else if du == nil {
		return nil, nil, respNotFound(nil)

	} else {
		// Succeeded
		return u.CloneWithClearance(curUser.IsSuperuser, curDU != nil && curDU.IsOwner, curDU != nil && curDU.IsModerator),
			du,
			nil
	}
}
