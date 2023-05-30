package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_embed"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"strings"
	"time"
)

func EmbedCommentCount(params api_embed.EmbedCommentCountParams) middleware.Responder {
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
	return api_embed.NewEmbedCommentCountOK().WithPayload(&api_embed.EmbedCommentCountOKBody{CommentCounts: cc})
}

func EmbedCommentDelete(params api_embed.EmbedCommentDeleteParams, user *data.User) middleware.Responder {
	// Verify the user is authenticated
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
	return api_embed.NewEmbedCommentDeleteNoContent()
}

func EmbedCommentList(params api_embed.EmbedCommentListParams, user *data.User) middleware.Responder {
	// Fetch the domain and the user (don't create one yet if there's none)
	domain, domainUser, err := svc.TheDomainService.FindDomainUserByHost(string(params.Body.Host), &user.ID, false)
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
	pageInfo := &models.PageInfo{
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
	if pageInfo.Idps, err = svc.TheDomainService.ListDomainFederatedIdPs(&domain.ID); err != nil {
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
	return api_embed.NewEmbedCommentListOK().WithPayload(&api_embed.EmbedCommentListOKBody{
		Commenters: commenters,
		Comments:   comments,
		PageInfo:   pageInfo,
	})
}

func EmbedCommentModerate(params api_embed.EmbedCommentModerateParams, user *data.User) middleware.Responder {
	// Verify the user is authenticated
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
	return api_embed.NewEmbedCommentModerateNoContent()
}

func EmbedCommentNew(params api_embed.EmbedCommentNewParams, user *data.User) middleware.Responder {
	// Fetch the domain and the user, creating one if necessary
	domain, domainUser, err := svc.TheDomainService.FindDomainUserByHost(string(params.Body.Host), &user.ID, true)
	if err == svc.ErrNotFound {
		// No domain found for this host
		return respForbidden(ErrorUnknownHost)
	} else if err != nil {
		return respServiceError(err)
	}

	// If the domain disallows anonymous commenting, verify the user is authenticated
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
	if params.Body.ParentID != "" {
		if parentID.UUID, err = uuid.Parse(string(params.Body.ParentID)); err != nil {
			return respBadRequest(ErrorInvalidUUID)
		}
		parentID.Valid = true
	}

	// Verify the domain, the page, and the user aren't readonly
	if domain.IsReadonly {
		return respForbidden(ErrorDomainReadonly)
	} else if page.IsReadonly {
		return respForbidden(ErrorPageReadonly)
	} else if domainUser.IsReadonly() {
		return respForbidden(ErrorUserReadonly)
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
	if !Verifier.NeedsModeration(comment, domain, user, domainUser) {
		comment.MarkApprovedBy(&user.ID)
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
	return api_embed.NewEmbedCommentNewOK().WithPayload(&api_embed.EmbedCommentNewOKBody{
		Comment:   comment.ToDTO(),
		Commenter: user.ToCommenter(domainUser.IsCommenter, domainUser.IsModerator),
	})
}

func EmbedCommentUpdate(params api_embed.EmbedCommentUpdateParams, user *data.User) middleware.Responder {
	// Verify the user is authenticated
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
	comment.Markdown = strings.TrimSpace(params.Body.Markdown)
	comment.HTML = util.MarkdownToHTML(comment.Markdown)

	// Persist the edits in the database
	if err := svc.TheCommentService.UpdateText(&comment.ID, comment.Markdown, comment.HTML); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_embed.NewEmbedCommentUpdateOK().WithPayload(&api_embed.EmbedCommentUpdateOKBody{Comment: comment.ToDTO()})
}

func EmbedCommentVote(params api_embed.EmbedCommentVoteParams, user *data.User) middleware.Responder {
	// Verify the user is authenticated
	if r := Verifier.UserIsAuthenticated(user); r != nil {
		return r
	}

	// Parse comment ID
	if commentID, err := data.DecodeUUID(params.UUID); err != nil {
		return respBadRequest(ErrorInvalidUUID)

		// Find the comment
	} else if comment, err := svc.TheCommentService.FindByID(commentID); err != nil {
		return respServiceError(err)

		// Make sure the user is not voting for their own comment
	} else if comment.UserCreated.UUID == user.ID {
		return respForbidden(ErrorSelfVote)

		// Update the vote and the comment
	} else if score, err := svc.TheCommentService.Vote(&comment.ID, &user.ID, *params.Body.Direction); err != nil {
		return respServiceError(err)

	} else {
		// Succeeded
		return api_embed.NewEmbedCommentVoteOK().WithPayload(&api_embed.EmbedCommentVoteOKBody{Score: int64(score)})
	}
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
