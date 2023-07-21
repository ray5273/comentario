package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
)

func CommentDelete(params api_general.CommentDeleteParams, user *data.User) middleware.Responder {
	// Delete the comment
	if r := commentDelete(params.UUID, user); r != nil {
		return r
	}

	// Succeeded
	return api_general.NewCommentDeleteNoContent()
}

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

	// Extract user ID
	var userID *uuid.UUID
	if params.UserID != nil {
		if userID, err = data.DecodeUUID(*params.UserID); err != nil {
			return respBadRequest(ErrorInvalidUUID.WithDetails(string(*params.UserID)))
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
		userID,
		user.IsSuperuser || domainUser.CanModerate(),
		swag.BoolValue(params.Approved),
		swag.BoolValue(params.Pending),
		swag.BoolValue(params.Rejected),
		swag.BoolValue(params.Others),
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

func CommentModerate(params api_general.CommentModerateParams, user *data.User) middleware.Responder {
	// Find the comment and related objects
	comment, _, _, domainUser, r := commentGetCommentPageDomainUser(params.UUID, &user.ID)
	if r != nil {
		return r
	}

	// Verify the user is a domain moderator
	if r := Verifier.UserCanModerateDomain(user, domainUser); r != nil {
		return r
	}

	// Update the comment's state in the database
	if err := svc.TheCommentService.Moderate(&comment.ID, &user.ID, swag.BoolValue(params.Body.Pending), swag.BoolValue(params.Body.Approved)); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewCommentModerateNoContent()
}

// commentDelete deletes a comment by its ID
func commentDelete(commentUUID strfmt.UUID, user *data.User) middleware.Responder {
	// Find the comment and related objects
	comment, page, domain, domainUser, r := commentGetCommentPageDomainUser(commentUUID, &user.ID)
	if r != nil {
		return r
	}

	// Check the user is allowed to delete the comment
	if r := Verifier.UserCanUpdateComment(user, domainUser, comment); r != nil {
		return r
	}

	// Mark the comment deleted
	if err := svc.TheCommentService.MarkDeleted(&comment.ID, &user.ID); err != nil {
		return respServiceError(err)
	}

	// Decrement page/domain comment count in the background, ignoring any errors
	go func() { _ = svc.ThePageService.IncrementCounts(&page.ID, -1, 0) }()
	go func() { _ = svc.TheDomainService.IncrementCounts(&domain.ID, -1, 0) }()

	// Succeeded
	return nil
}

// commentGetCommentPageDomainUser finds and returns a Comment, DomainPage, Domain, and DomainUser by a sring comment ID
func commentGetCommentPageDomainUser(commentUUID strfmt.UUID, userID *uuid.UUID) (*data.Comment, *data.DomainPage, *data.Domain, *data.DomainUser, middleware.Responder) {
	// Parse comment ID
	if commentID, err := data.DecodeUUID(commentUUID); err != nil {
		return nil, nil, nil, nil, respBadRequest(ErrorInvalidUUID.WithDetails(string(commentUUID)))

		// Find the comment
	} else if comment, err := svc.TheCommentService.FindByID(commentID); err != nil {
		return nil, nil, nil, nil, respServiceError(err)

		// Find the domain page
	} else if page, err := svc.ThePageService.FindByID(&comment.PageID); err != nil {
		return nil, nil, nil, nil, respServiceError(err)

		// Fetch the domain and the user
	} else if domain, domainUser, err := svc.TheDomainService.FindDomainUserByID(&page.DomainID, userID); err != nil {
		return nil, nil, nil, nil, respServiceError(err)

	} else {
		// Succeeded
		return comment, page, domain, domainUser, nil
	}
}
