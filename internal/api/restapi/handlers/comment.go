package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_commenter"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"strings"
	"time"
)

func CommentCount(params api_commenter.CommentCountParams) middleware.Responder {
	// Fetch the domain for the given host
	d, err := svc.TheDomainService.FindByHost(string(params.Body.Host))
	if err != nil {
		respServiceError(err)
	}

	// Fetch comment counts
	cc, err := svc.ThePageService.CommentCounts(&d.ID, util.ToStringSlice(params.Body.Paths))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_commenter.NewCommentCountOK().WithPayload(&api_commenter.CommentCountOKBody{CommentCounts: cc})
}

func CommentDelete(params api_commenter.CommentDeleteParams, user *data.User) middleware.Responder {
	// Verify the commenter is authenticated
	if r := Verifier.UserIsAuthenticated(user); r != nil {
		return r
	}

	// Find the comment and related objects
	comment, page, domain, domainUser, r := commentGetCommentPageDomainUser(params.UUID, &user.ID)
	if r != nil {
		return r
	}

	// Check the user is allowed to update the comment
	if r := Verifier.UserCanUpdateComment(comment, domainUser); r != nil {
		return r
	}

	// Mark the comment deleted
	if err := svc.TheCommentService.MarkDeleted(&comment.ID, &user.ID); err != nil {
		return respServiceError(err)

		// Decrement page comment count
	} else if err := svc.ThePageService.IncrementCounts(&page.ID, -1, 0); err != nil {
		return respServiceError(err)

		// Decrement domain comment count
	} else if err := svc.TheDomainService.IncrementCounts(&domain.ID, -1, 0); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_commenter.NewCommentDeleteNoContent()
}

func CommentList(params api_commenter.CommentListParams, user *data.User) middleware.Responder {
	// Fetch the domain and the user
	domain, domainUser, err := svc.TheDomainService.FindDomainUserByHost(string(params.Body.Host), &user.ID)
	if err == svc.ErrNotFound {
		// No domain found for this host
		return respForbidden(ErrorUnknownHost)
	} else if err != nil {
		return respServiceError(err)
	}

	// Fetch the page, registering a new pageview
	page, err := svc.ThePageService.GetRegisteringView(&domain.ID, data.PathToString(params.Body.Path))
	if err != nil {
		return respServiceError(err)
	}

	// Prepare page info
	pi := &models.PageInfo{
		AuthAnonymous:    domain.AuthAnonymous,
		AuthLocal:        domain.AuthLocal,
		AuthSso:          domain.AuthSso,
		DefaultSort:      models.CommentSort(domain.DefaultSort),
		DomainID:         strfmt.UUID(domain.ID.String()),
		IsDomainReadonly: domain.IsReadonly,
		IsPageReadonly:   page.IsReadonly,
		PageID:           strfmt.UUID(page.ID.String()),
		SsoURL:           domain.SsoURL,
	}

	// Fetch the domain's identity providers
	if pi.Idps, err = svc.TheDomainService.ListDomainFederatedIdPs(&domain.ID); err != nil {
		return respServiceError(err)
	}

	// Fetch comments and commenters
	comments, commenters, err := svc.TheCommentService.ListWithCommentersByPage(user, page, domainUser != nil && domainUser.IsModerator)
	if err != nil {
		return respServiceError(err)
	}

	// Register a view in domain statistics, ignoring any error
	// TODO new-db _ = svc.TheDomainService.RegisterView(domain.Host, commenter)

	// Succeeded
	return api_commenter.NewCommentListOK().WithPayload(&api_commenter.CommentListOKBody{
		Commenters: commenters,
		Comments:   comments,
		PageInfo:   nil,
	})
}

func CommentModerate(params api_commenter.CommentModerateParams, user *data.User) middleware.Responder {
	// Verify the commenter is authenticated
	if r := Verifier.UserIsAuthenticated(user); r != nil {
		return r
	}

	/* TODO new-db
	// Fetch the comment
	comment, err := svc.TheCommentService.FindByHexID(*params.Body.CommentHex)
	if err != nil {
		return respServiceError(err)
	}

	// Verify the user is a domain moderator
	if r := Verifier.UserIsDomainModerator(principal.GetUser().Email, comment.Host); r != nil {
		return r
	}

	// Update the comment's state in the database
	if err = svc.TheCommentService.Moderate(comment.CommentHex); err != nil {
		return respServiceError(err)
	}
	*/
	// Succeeded
	return api_commenter.NewCommentModerateNoContent()
}

func CommentNew(params api_commenter.CommentNewParams, user *data.User) middleware.Responder {
	// Fetch the domain and the user
	domain, domainUser, err := svc.TheDomainService.FindDomainUserByHost(string(params.Body.Host), &user.ID)
	if err == svc.ErrNotFound {
		// No domain found for this host
		return respForbidden(ErrorUnknownHost)
	} else if err != nil {
		return respServiceError(err)
	}

	// If the domain disallows anonymous commenting, verify the commenter is authenticated
	if !domain.AuthAnonymous {
		if r := Verifier.UserIsAuthenticated(user); r != nil {
			return r
		}
	}

	// Fetch the page: it must exist at this point, under the assumption that one has to list existing comments prior to
	// adding a new one
	page, err := svc.ThePageService.FindByDomainPath(&domain.ID, data.PathToString(params.Body.Path))
	if err != nil {
		return respServiceError(err)
	}

	// Parse the parent ID
	var parentID uuid.NullUUID
	if err := parentID.Scan(params.Body.ParentID); err != nil {
		return respBadRequest(ErrorInvalidUUID)
	}

	// Verify the domain, the page, and the user aren't readonly
	if domain.IsReadonly {
		return respForbidden(ErrorDomainReadonly)
	} else if page.IsReadonly {
		return respForbidden(ErrorPageReadonly)
	} else if domainUser.IsReadonly() {
		return respForbidden(ErrorUserReadonly)
	}

	// If the domain user doesn't exist yet, add one
	if domainUser == nil {
		domainUser = &data.DomainUser{
			DomainID:        domain.ID,
			UserID:          user.ID,
			IsCommenter:     true,
			NotifyReplies:   true,
			NotifyModerator: true,
		}
		if err := svc.TheUserService.CreateDomainUser(domainUser); err != nil {
			return respServiceError(err)
		}
	}

	// Prepare a comment
	comment := &data.Comment{
		ID:          uuid.New(),
		ParentID:    parentID,
		PageID:      page.ID,
		Markdown:    strings.TrimSpace(params.Body.Markdown),
		CreatedTime: time.Now().UTC(),
		UserCreated: uuid.NullUUID{UUID: user.ID, Valid: true},
	}
	comment.HTML = util.MarkdownToHTML(comment.Markdown)

	// Determine comment state
	if domainUser.IsModerator {
		comment.IsApproved = true
	} else if domain.ModerationPolicy == data.DomainModerationPolicyAll || user.IsAnonymous() && domain.ModerationPolicy == data.DomainModerationPolicyAnonymous {
		// Not approved
	} else /* TODO new-db if domain.AutoSpamFilter &&
		svc.TheAntispamService.CheckForSpam(
			domain.Host,
			util.UserIP(params.HTTPRequest),
			util.UserAgent(params.HTTPRequest),
			commenter.Name,
			commenter.Email,
			commenter.WebsiteURL,
			markdown,
		) {
		state = models.CommentStateFlagged
	} else*/{
		comment.IsApproved = true
	}

	// If the comment is approved, also set the audit fields
	if comment.IsApproved {
		comment.UserApproved = comment.UserCreated
		comment.ApprovedTime = comment.CreatedTime
	}

	// Persist a new comment record
	if err := svc.TheCommentService.Create(comment); err != nil {
		return respServiceError(err)

		// Increment page comment count
	} else if err := svc.ThePageService.IncrementCounts(&page.ID, 1, 0); err != nil {
		return respServiceError(err)

		// Increment domain comment count
	} else if err := svc.TheDomainService.IncrementCounts(&domain.ID, 1, 0); err != nil {
		return respServiceError(err)
	}

	// Send an email notification to moderators, if we notify about every comment or comments pending moderation and
	// the comment isn't approved yet, in the background
	if domain.ModNotifyPolicy == data.DomainModNotifyPolicyAll || !comment.IsApproved && domain.ModNotifyPolicy == data.DomainModNotifyPolicyPending {
		// Best effort: ignore errors
		go sendCommentModNotifications(domain, page, comment, user)
	}

	// If it's a reply and the comment is approved, send out a reply notifications, in the background
	if !comment.IsRoot() && comment.IsApproved {
		// Best effort: ignore errors
		go sendCommentReplyNotifications(domain, page, comment, user)
	}

	// Succeeded
	return api_commenter.NewCommentNewOK().WithPayload(&api_commenter.CommentNewOKBody{
		Comment:   comment.ToDTO(),
		Commenter: user.ToCommenter(domainUser.IsCommenter, domainUser.IsModerator),
	})
}

func CommentUpdate(params api_commenter.CommentUpdateParams, user *data.User) middleware.Responder {
	// Verify the commenter is authenticated
	if r := Verifier.UserIsAuthenticated(user); r != nil {
		return r
	}

	// Find the comment and related objects
	comment, _, _, domainUser, r := commentGetCommentPageDomainUser(params.UUID, &user.ID)
	if r != nil {
		return r
	}

	// Check the user is allowed to update the comment
	if r := Verifier.UserCanUpdateComment(comment, domainUser); r != nil {
		return r
	}

	// Render the comment into HTML
	html := util.MarkdownToHTML(params.Body.Markdown)

	// Persist the edits in the database
	if err := svc.TheCommentService.UpdateText(&comment.ID, params.Body.Markdown, html); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_commenter.NewCommentUpdateOK().WithPayload(&api_commenter.CommentUpdateOKBody{Comment: comment.ToDTO()})
}

func CommentVote(params api_commenter.CommentVoteParams, user *data.User) middleware.Responder {
	// Verify the commenter is authenticated
	if r := Verifier.UserIsAuthenticated(user); r != nil {
		return r
	}

	// Parse comment ID
	if commentID, err := data.DecodeUUID(params.UUID); err != nil {
		return respBadRequest(ErrorInvalidUUID)

		// Find the comment
	} else if comment, err := svc.TheCommentService.FindByID(commentID); err != nil {
		return respServiceError(err)

		// Make sure the commenter is not voting for their own comment
	} else if comment.UserCreated.UUID == user.ID {
		return respForbidden(ErrorSelfVote)

		// Update the vote and the comment
	} else if err := svc.TheCommentService.Vote(&comment.ID, &user.ID, int(swag.Int64Value(params.Body.Direction))); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_commenter.NewCommentVoteNoContent()
}

func commentGetCommentPageDomainUser(commentUUID strfmt.UUID, userID *uuid.UUID) (*data.Comment, *data.DomainPage, *data.Domain, *data.DomainUser, middleware.Responder) {
	// Parse comment ID
	if commentID, err := data.DecodeUUID(commentUUID); err != nil {
		return nil, nil, nil, nil, respBadRequest(ErrorInvalidUUID)

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
