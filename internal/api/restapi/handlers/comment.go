package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
)

func CommentList(params api_general.CommentListParams, user *data.User) middleware.Responder {
	// Extract domain ID
	domainID, err := data.DecodeUUID(params.Domain)
	if err != nil {
		return respBadRequest(ErrorInvalidUUID.WithDetails(string(params.Domain)))
	}

	// Extract page ID
	var pageID *uuid.UUID
	if params.PageID != nil {
		if pageID, err = data.DecodeUUID(*params.PageID); err != nil {
			return respBadRequest(ErrorInvalidUUID.WithDetails(string(*params.PageID)))
		}
	}

	// Find the domain user, if any
	_, domainUser, err := svc.TheDomainService.FindDomainUserByID(domainID, &user.ID)
	if err != nil {
		return respServiceError(err)
	}

	// Fetch comments the user has access to
	cs, crs, err := svc.TheCommentService.ListWithCommentersByDomainPage(
		user,
		domainID,
		pageID,
		user.IsSuperuser || domainUser != nil && (domainUser.IsOwner || domainUser.IsModerator),
		swag.StringValue(params.Filter),
		swag.StringValue(params.SortBy),
		data.SortDirection(swag.BoolValue(params.SortDesc)),
		int(swag.Uint64Value(params.Page)-1))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewCommentListOK().WithPayload(&api_general.CommentListOKBody{Commenters: crs, Comments: cs})
}
