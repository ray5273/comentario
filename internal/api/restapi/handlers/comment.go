package handlers

import (
	"fmt"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"time"
)

func CommentCount(params api_general.CommentCountParams, user *data.User) middleware.Responder {
	// Extract domain ID
	domainID, r := parseUUID(params.Domain)
	if r != nil {
		return r
	}

	// Extract page ID
	pageID, r := parseUUIDPtr(params.PageID)
	if r != nil {
		return r
	}

	// Extract user ID
	userID, r := parseUUIDPtr(params.UserID)
	if r != nil {
		return r
	}

	// Find the domain user, if any
	_, domainUser, err := svc.TheDomainService.FindDomainUserByID(domainID, &user.ID)
	if err != nil {
		return respServiceError(err)
	}

	// Fetch comments the user has access to
	cnt, err := svc.TheCommentService.Count(
		user,
		domainUser,
		domainID,
		pageID,
		userID,
		swag.BoolValue(params.Approved),
		swag.BoolValue(params.Pending),
		swag.BoolValue(params.Rejected),
		swag.BoolValue(params.Deleted))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewCommentCountOK().WithPayload(cnt)
}

func CommentDelete(params api_general.CommentDeleteParams, user *data.User) middleware.Responder {
	// Delete the comment
	if r := commentDelete(params.UUID, user); r != nil {
		return r
	}

	// Succeeded
	return api_general.NewCommentDeleteNoContent()
}

func CommentGet(params api_general.CommentGetParams, user *data.User) middleware.Responder {
	// Find the comment and related objects
	comment, page, domain, domainUser, r := commentGetCommentPageDomainUser(params.UUID, &user.ID)
	if r != nil {
		return r
	}

	// Find the comment author, if any
	var cr *models.Commenter
	if comment.UserCreated.Valid && comment.UserCreated.UUID != data.AnonymousUser.ID {
		if u, du, err := svc.TheUserService.FindDomainUserByID(&comment.UserCreated.UUID, &domain.ID); err != nil {
			return respServiceError(err)
		} else {
			cr = u.
				CloneWithClearance(
					user.IsSuperuser,
					domainUser != nil && domainUser.IsOwner,
					domainUser != nil && domainUser.IsModerator).
				ToCommenter(du != nil && du.IsCommenter, du != nil && du.IsModerator)
		}
	}

	// If the current user is an owner or a superuser
	var um, ud *models.User
	if user.IsSuperuser || domainUser != nil && domainUser.IsOwner {
		// Fetch the user moderated, if any
		if comment.UserModerated.Valid {
			if u, err := svc.TheUserService.FindUserByID(&comment.UserModerated.UUID); err != nil {
				return respServiceError(err)
			} else {
				um = u.CloneWithClearance(user.IsSuperuser, true, true).ToDTO()
			}
		}
		// Fetch the user deleted, if any
		if comment.IsDeleted && comment.UserDeleted.Valid {
			if u, err := svc.TheUserService.FindUserByID(&comment.UserDeleted.UUID); err != nil {
				return respServiceError(err)
			} else {
				ud = u.CloneWithClearance(user.IsSuperuser, true, true).ToDTO()
			}
		}
	}

	// Succeeded
	return api_general.NewCommentGetOK().
		WithPayload(&api_general.CommentGetOKBody{
			Comment:   comment.CloneWithClearance(user, domainUser).ToDTO(domain.IsHTTPS, domain.Host, page.Path),
			Commenter: cr,
			Deleter:   ud,
			Moderator: um,
			Page:      page.CloneWithClearance(user.IsSuperuser, domainUser != nil && domainUser.IsOwner).ToDTO(),
		})
}

func CommentList(params api_general.CommentListParams, user *data.User) middleware.Responder {
	// Extract domain ID
	domainID, r := parseUUID(params.Domain)
	if r != nil {
		return r
	}

	// Extract page ID
	pageID, r := parseUUIDPtr(params.PageID)
	if r != nil {
		return r
	}

	// Extract user ID
	userID, r := parseUUIDPtr(params.UserID)
	if r != nil {
		return r
	}

	// Find the domain user, if any
	_, domainUser, err := svc.TheDomainService.FindDomainUserByID(domainID, &user.ID)
	if err != nil {
		return respServiceError(err)
	}

	// Fetch comments the user has access to
	cs, crs, err := svc.TheCommentService.ListWithCommentersByDomainPage(
		user,
		domainUser,
		domainID,
		pageID,
		userID,
		swag.BoolValue(params.Approved),
		swag.BoolValue(params.Pending),
		swag.BoolValue(params.Rejected),
		swag.BoolValue(params.Deleted),
		false,
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
	// Update the comment
	if r := commentModerate(params.UUID, user, swag.BoolValue(params.Body.Pending), swag.BoolValue(params.Body.Approve)); r != nil {
		return r
	}

	// Succeeded
	return api_general.NewCommentModerateNoContent()
}

// commentDelete verifies the user is allowed to delete a comment (specified by its ID) and deletes it
func commentDelete(commentUUID strfmt.UUID, user *data.User) middleware.Responder {
	// Find the comment and related objects
	comment, page, domain, domainUser, r := commentGetCommentPageDomainUser(commentUUID, &user.ID)
	if r != nil {
		return r
	}

	// Check the user is allowed to delete the comment
	if r := Verifier.UserCanDeleteComment(user, domainUser, comment); r != nil {
		return r
	}

	// Mark the comment deleted
	if err := svc.TheCommentService.MarkDeleted(&comment.ID, &user.ID); err != nil {
		return respServiceError(err)
	}

	// Decrement page/domain comment count in the background, ignoring any errors
	go func() { _ = svc.ThePageService.IncrementCounts(&page.ID, -1, 0) }()
	go func() { _ = svc.TheDomainService.IncrementCounts(&domain.ID, -1, 0) }()

	// Notify websocket subscribers
	commentWebSocketNotify(page, comment, "delete")

	// Succeeded
	return nil
}

// commentGetCommentPageDomainUser finds and returns a Comment, DomainPage, Domain, and DomainUser by a string comment
// ID
func commentGetCommentPageDomainUser(commentUUID strfmt.UUID, userID *uuid.UUID) (*data.Comment, *data.DomainPage, *data.Domain, *data.DomainUser, middleware.Responder) {
	// Parse comment ID
	if commentID, r := parseUUID(commentUUID); r != nil {
		return nil, nil, nil, nil, r

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

// commentModerate verifies the user is allowed to moderate a comment (specified by its ID) and updates it
func commentModerate(commentUUID strfmt.UUID, user *data.User, pending, approve bool) middleware.Responder {
	// Find the comment and related objects
	comment, page, _, domainUser, r := commentGetCommentPageDomainUser(commentUUID, &user.ID)
	if r != nil {
		return r
	}

	// Verify the user is a domain moderator
	if r := Verifier.UserCanModerateDomain(user, domainUser); r != nil {
		return r
	}

	// Determine the pending reason (if pending)
	reason := ""
	if pending {
		reason = fmt.Sprintf("Set to pending by %s <%s>", user.Name, user.Email)
	}

	// Update the comment's state in the database
	if err := svc.TheCommentService.Moderate(&comment.ID, &user.ID, pending, approve, reason); err != nil {
		return respServiceError(err)
	}

	// Notify websocket subscribers
	commentWebSocketNotify(page, comment, "update")

	// Succeeded
	return nil
}

// commentWebSocketNotify notifies websocket subscribers about a change in the given comment, in background
func commentWebSocketNotify(page *data.DomainPage, comment *data.Comment, action string) {
	go func() {
		// Postpone the update a bit to let the frontend finish the API call
		time.Sleep(500 * time.Millisecond)
		svc.TheWebSocketsService.Send(&page.DomainID, &comment.ID, data.NullUUIDPtr(&comment.ParentID), page.Path, action)
	}()
}
