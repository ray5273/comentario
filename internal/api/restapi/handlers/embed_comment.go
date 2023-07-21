package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
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

	// Delete the comment
	if r := commentDelete(params.UUID, user); r != nil {
		return r
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
	page, err := svc.ThePageService.GetRegisteringView(domain, data.PathToString(params.Body.Path), params.HTTPRequest)
	if err != nil {
		return respServiceError(err)
	}

	// Prepare page info
	pageInfo := &models.PageInfo{
		AuthAnonymous:    domain.AuthAnonymous,
		AuthLocal:        domain.AuthLocal,
		AuthSso:          domain.AuthSSO,
		DefaultSort:      models.CommentSort(domain.DefaultSort),
		DomainID:         strfmt.UUID(domain.ID.String()),
		DomainName:       domain.DisplayName(),
		Idps:             nil,
		IsDomainReadonly: domain.IsReadonly,
		IsPageReadonly:   page.IsReadonly,
		PageID:           strfmt.UUID(page.ID.String()),
		SsoURL:           domain.SSOURL,
	}

	// Fetch the domain's identity providers
	if pageInfo.Idps, err = svc.TheDomainService.ListDomainFederatedIdPs(&domain.ID); err != nil {
		return respServiceError(err)
	}

	// Fetch comments and commenters
	comments, commenters, err := svc.TheCommentService.ListWithCommentersByDomainPage(
		user,
		&page.DomainID,
		&page.ID,
		nil,
		user.IsSuperuser || domainUser.CanModerate(),
		true,
		true,
		true,
		true,
		"",
		"",
		data.SortAsc,
		-1)
	if err != nil {
		return respServiceError(err)
	}

	// Register a view in page/domain statistics in the background, ignoring any error
	go func() { _ = svc.ThePageService.IncrementCounts(&page.ID, 0, 1) }()
	go func() { _ = svc.TheDomainService.IncrementCounts(&domain.ID, 0, 1) }()

	// Succeeded
	return api_embed.NewEmbedCommentListOK().WithPayload(&api_embed.EmbedCommentListOKBody{
		Commenters: commenters,
		Comments:   comments,
		PageInfo:   pageInfo,
	})
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
	if b, err := Verifier.NeedsModeration(comment, domain, user, domainUser); err != nil {
		return respServiceError(err)
	} else if b {
		// Comment needs to be approved
		comment.IsPending = true
	} else {
		// No need for moderator approval
		comment.MarkApprovedBy(&user.ID)
	}

	// Persist a new comment record
	if err := svc.TheCommentService.Create(comment); err != nil {
		return respServiceError(err)
	}

	// Increment page/domain comment counts in the background, ignoring any error
	go func() { _ = svc.ThePageService.IncrementCounts(&page.ID, 1, 0) }()
	go func() { _ = svc.TheDomainService.IncrementCounts(&domain.ID, 1, 0) }()

	// Send an email notification to moderators, if we notify about every comment or comments pending moderation and
	// the comment isn't approved yet, in the background
	if domain.ModNotifyPolicy == data.DomainModNotifyPolicyAll || comment.IsPending && domain.ModNotifyPolicy == data.DomainModNotifyPolicyPending {
		go func() { _ = sendCommentModNotifications(domain, page, comment, user) }()
	}

	// If it's a reply and the comment is approved, send out a reply notifications, in the background
	if !comment.IsRoot() && comment.IsApproved {
		go func() { _ = sendCommentReplyNotifications(domain, page, comment, user) }()
	}

	// Succeeded
	return api_embed.NewEmbedCommentNewOK().WithPayload(&api_embed.EmbedCommentNewOKBody{
		Comment:   comment.ToDTO(domain.RootURL(), page.Path),
		Commenter: user.ToCommenter(domainUser.IsCommenter, domainUser.IsModerator, domainUser.IsModerator),
	})
}

func EmbedCommentSticky(params api_embed.EmbedCommentStickyParams, user *data.User) middleware.Responder {
	// Verify the user is authenticated
	if r := Verifier.UserIsAuthenticated(user); r != nil {
		return r
	}

	// Find the comment and related objects
	comment, _, _, domainUser, r := commentGetCommentPageDomainUser(params.UUID, &user.ID)
	if r != nil {
		return r
	}

	// Verify the user is a moderator
	if r := Verifier.UserCanModerateDomain(user, domainUser); r != nil {
		return r
	}

	// Verify it's a top-level comment
	if !comment.IsRoot() {
		return respBadRequest(ErrorNoRootComment)
	}

	// Update the comment, if necessary
	b := swag.BoolValue(params.Body.Sticky)
	if comment.IsSticky != b {
		if err := svc.TheCommentService.UpdateSticky(&comment.ID, b); err != nil {
			return respServiceError(err)
		}
	}

	// Succeeded or no change
	return api_embed.NewEmbedCommentStickyNoContent()
}

func EmbedCommentUpdate(params api_embed.EmbedCommentUpdateParams, user *data.User) middleware.Responder {
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
	if r := Verifier.UserCanUpdateComment(user, domainUser, comment); r != nil {
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
	return api_embed.NewEmbedCommentUpdateOK().
		WithPayload(&api_embed.EmbedCommentUpdateOKBody{Comment: comment.ToDTO(domain.RootURL(), page.Path)})
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
