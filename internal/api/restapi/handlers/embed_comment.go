package handlers

import (
	"errors"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_embed"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/persistence"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"maps"
	"slices"
	"time"
)

func EmbedCommentCount(params api_embed.EmbedCommentCountParams) middleware.Responder {
	// Fetch the domain for the given host
	d, err := svc.Services.DomainService(nil).FindByHost(string(params.Body.Host))
	if err != nil {
		return respServiceError(err)
	}

	// Fetch comment counts
	cc, err := svc.Services.PageService(nil).CommentCounts(&d.ID, util.ToStringSlice(params.Body.Paths))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_embed.NewEmbedCommentCountOK().WithPayload(&api_embed.EmbedCommentCountOKBody{CommentCounts: cc})
}

func EmbedCommentDelete(params api_embed.EmbedCommentDeleteParams, user *data.User) middleware.Responder {
	// Delete the comment
	if r := commentDelete(params.UUID, user); r != nil {
		return r
	}

	// Succeeded
	return api_embed.NewEmbedCommentDeleteNoContent()
}

func EmbedCommentGet(params api_embed.EmbedCommentGetParams) middleware.Responder {
	// Try to authenticate the user
	user, _, err := svc.Services.AuthService(nil).GetUserSessionBySessionHeader(params.HTTPRequest)
	if err != nil {
		// Failed, consider the user anonymous
		user = data.AnonymousUser
	}

	// Find the comment and related objects
	comment, page, domain, domainUser, r := commentGetCommentPageDomainUser(params.UUID, &user.ID)
	if r != nil {
		return r
	}

	// To be consistent with the way comment list works, return a "404 Not Found" when:
	// * comment is rejected
	// * comment is deleted and deleted comments should be hidden
	// * comment is pending and the user isn't a moderator, and it's not their comment
	pending := comment.IsPending
	rejected := !pending && !comment.IsApproved
	moderator := user.IsSuperuser || domainUser.CanModerate()
	anonymous := !moderator && user.IsAnonymous()
	ownComment := !anonymous && comment.UserCreated.Valid && comment.UserCreated.UUID == user.ID
	delHidden := comment.IsDeleted && !svc.Services.DomainConfigService(nil).GetBool(&domain.ID, data.DomainConfigKeyShowDeletedComments)
	if rejected || delHidden || pending && !moderator && !ownComment {
		return respNotFound(nil)
	}

	// Find the comment author, if any
	var cr *models.Commenter
	if comment.UserCreated.Valid {
		// Anonymous commenter
		if comment.UserCreated.UUID == data.AnonymousUser.ID {
			cr = data.AnonymousUser.ToCommenter(true, false)

			// Non-anonymous, existing user: fetch it
		} else if u, du, err := svc.Services.UserService(nil).FindDomainUserByID(&comment.UserCreated.UUID, &domain.ID); err != nil {
			return respServiceError(err)

		} else {
			// Convert to Commenter
			cr = u.
				CloneWithClearance(user.IsSuperuser, domainUser.IsAnOwner(), domainUser.IsAModerator()).
				ToCommenter(du.IsACommenter(), du.IsAModerator())
		}
	}

	// Succeeded
	return api_embed.NewEmbedCommentGetOK().WithPayload(&api_embed.EmbedCommentGetOKBody{
		Comment:   comment.CloneWithClearance(user, domainUser).ToDTO(domain.IsHTTPS, domain.Host, page.Path),
		Commenter: cr,
	})
}

func EmbedCommentList(params api_embed.EmbedCommentListParams) middleware.Responder {
	// Try to authenticate the user
	user, _, err := svc.Services.AuthService(nil).GetUserSessionBySessionHeader(params.HTTPRequest)
	if err != nil {
		// Failed, consider the user anonymous
		user = data.AnonymousUser
	}

	// Fetch the domain and the user (don't create one yet if there's none)
	domain, domainUser, err := svc.Services.DomainService(nil).FindDomainUserByHost(string(params.Body.Host), &user.ID, false)
	if errors.Is(err, svc.ErrNotFound) {
		// No domain found for this host
		return respForbidden(exmodels.ErrorUnknownHost)
	} else if err != nil {
		return respServiceError(err)
	}

	// Fetch the page, registering a new pageview
	page, _, err := svc.Services.PageService(nil).UpsertByDomainPath(domain, data.PathToString(params.Body.Path), "", params.HTTPRequest)
	if err != nil {
		return respServiceError(err)
	}

	// Obtain domain config
	dc, err := svc.Services.DomainConfigService(nil).GetAll(&domain.ID)
	if err != nil {
		return respServiceError(err)
	}

	// Prepare page info
	pageInfo := &models.PageInfo{
		AuthAnonymous:            domain.AuthAnonymous,
		AuthLocal:                domain.AuthLocal,
		AuthSso:                  domain.AuthSSO,
		BaseDocsURL:              config.ServerConfig.BaseDocsURL,
		CommentDeletionAuthor:    dc.GetBool(data.DomainConfigKeyCommentDeletionAuthor),
		CommentDeletionModerator: dc.GetBool(data.DomainConfigKeyCommentDeletionModerator),
		CommentEditingAuthor:     dc.GetBool(data.DomainConfigKeyCommentEditingAuthor),
		CommentEditingModerator:  dc.GetBool(data.DomainConfigKeyCommentEditingModerator),
		DefaultLangID:            util.DefaultLanguage.String(),
		DefaultSort:              models.CommentSort(domain.DefaultSort),
		DomainID:                 strfmt.UUID(domain.ID.String()),
		DomainName:               domain.DisplayName(),
		EnableCommentVoting:      dc.GetBool(data.DomainConfigKeyEnableCommentVoting),
		EnableRss:                dc.GetBool(data.DomainConfigKeyRSSEnabled),
		FederatedSignupEnabled:   dc.GetBool(data.DomainConfigKeyFederatedSignupEnabled),
		IsDomainReadonly:         domain.IsReadonly,
		IsPageReadonly:           page.IsReadonly,
		LiveUpdateEnabled:        svc.Services.WebSocketsService().Active(),
		LocalSignupEnabled:       dc.GetBool(data.DomainConfigKeyLocalSignupEnabled),
		MarkdownImagesEnabled:    dc.GetBool(data.DomainConfigKeyMarkdownImagesEnabled),
		MarkdownLinksEnabled:     dc.GetBool(data.DomainConfigKeyMarkdownLinksEnabled),
		MarkdownTablesEnabled:    dc.GetBool(data.DomainConfigKeyMarkdownTablesEnabled),
		MaxCommentLength:         int64(dc.GetInt(data.DomainConfigKeyMaxCommentLength)),
		PageID:                   strfmt.UUID(page.ID.String()),
		PrivacyPolicyURL:         config.ServerConfig.PrivacyPolicyURL,
		ShowDeletedComments:      dc.GetBool(data.DomainConfigKeyShowDeletedComments),
		ShowLoginForUnauth:       dc.GetBool(data.DomainConfigKeyShowLoginForUnauth),
		SsoNonInteractive:        domain.SSONonInteractive,
		SsoSignupEnabled:         dc.GetBool(data.DomainConfigKeySsoSignupEnabled),
		SsoURL:                   domain.SSOURL,
		TermsOfServiceURL:        config.ServerConfig.TermsOfServiceURL,
		Version:                  svc.Services.VersionService().CurrentVersion(),
	}

	// Fetch the domain's identity providers
	if idpIDs, err := svc.Services.DomainService(nil).ListDomainFederatedIdPs(&domain.ID); err != nil {
		return respServiceError(err)
	} else {
		// Make a list of identity providers whose IDs are on the list
		for _, idpID := range idpIDs {
			if _, ok, _, fidp := config.GetFederatedIdP(idpID); ok {
				pageInfo.Idps = append(pageInfo.Idps, fidp.ToDTO())
			}
		}
	}

	// Fetch comments and commenters
	comments, commenterMap, err := svc.Services.CommentService(nil).ListWithCommenters(
		user,
		domainUser,
		&domain.ID,
		&page.ID,
		nil,
		nil,
		true,
		true,
		false, // Don't include rejected: no one's interested in spam
		svc.Services.DomainConfigService(nil).GetBool(&domain.ID, data.DomainConfigKeyShowDeletedComments),
		true, // Filter out orphans (they won't show up on the client anyway)
		"",
		"",
		data.SortAsc,
		-1)
	if err != nil {
		return respServiceError(err)
	}

	// Register a view in domain statistics in the background, ignoring any error (pageviews are already incremented in
	// the upsert above)
	go func() { _ = svc.Services.DomainService(nil).IncrementCounts(&domain.ID, 0, 1) }()

	// Succeeded
	return api_embed.NewEmbedCommentListOK().WithPayload(&api_embed.EmbedCommentListOKBody{
		Commenters: slices.Collect(maps.Values(commenterMap)),
		Comments:   comments,
		PageInfo:   pageInfo,
	})
}

func EmbedCommentModerate(params api_embed.EmbedCommentModerateParams, user *data.User) middleware.Responder {
	// Update the comment
	if r := commentModerate(params.UUID, user, false, swag.BoolValue(params.Body.Approve)); r != nil {
		return r
	}

	// Succeeded
	return api_embed.NewEmbedCommentModerateNoContent()
}

func EmbedCommentNew(params api_embed.EmbedCommentNewParams) middleware.Responder {
	user := data.AnonymousUser

	// If the comment isn't submitted as a unregistered, authenticate the user
	if !params.Body.Unregistered {
		if u, _, err := svc.Services.AuthService(nil).GetUserSessionBySessionHeader(params.HTTPRequest); err != nil {
			return respUnauthorized(exmodels.ErrorUnauthenticated)
		} else {
			// Successfully authenticated
			user = u
		}
	}

	// Fetch the domain and the user, creating one if necessary
	domain, domainUser, err := svc.Services.DomainService(nil).FindDomainUserByHost(string(params.Body.Host), &user.ID, true)
	if errors.Is(err, svc.ErrNotFound) {
		// No domain found for this host
		return respForbidden(exmodels.ErrorUnknownHost)
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
	page, err := svc.Services.PageService(nil).FindByDomainPath(&domain.ID, data.PathToString(params.Body.Path))
	if err != nil {
		return respServiceError(err)
	}

	// Parse the parent ID
	var parentID uuid.NullUUID
	if params.Body.ParentID != "" {
		if pid, r := parseUUID(params.Body.ParentID); r != nil {
			return r
		} else {
			parentID.UUID = *pid
			parentID.Valid = true
		}
	}

	// Verify the domain, the page, and the user aren't readonly
	if domain.IsReadonly {
		return respForbidden(exmodels.ErrorDomainReadonly)
	} else if page.IsReadonly {
		return respForbidden(exmodels.ErrorPageReadonly)
	} else if domainUser.IsReadonly() {
		return respForbidden(exmodels.ErrorUserReadonly)
	}

	// Prepare a comment
	comment := &data.Comment{
		ID:          uuid.New(),
		ParentID:    parentID,
		PageID:      page.ID,
		CreatedTime: time.Now().UTC(),
		UserCreated: uuid.NullUUID{UUID: user.ID, Valid: true},
	}
	if params.Body.Unregistered {
		comment.AuthorName = params.Body.AuthorName
	}
	if err := svc.Services.CommentService(nil).SetMarkdown(comment, params.Body.Markdown, &domain.ID, nil); err != nil {
		return respServiceError(err)
	}
	comment.AuthorIP, comment.AuthorCountry = util.UserIPCountry(params.HTTPRequest, !config.ServerConfig.LogFullIPs)

	// Determine comment state
	if b, reason, err := svc.Services.PerlustrationService().NeedsModeration(params.HTTPRequest, comment, domain, page, user, domainUser, false); err != nil {
		return respServiceError(err)
	} else if b {
		// Comment needs to be approved
		comment.WithModerated(nil, true, false, reason)
	} else {
		// No need for moderator approval
		comment.WithModerated(&user.ID, false, true, "")
	}

	// Persist a new comment record. No transaction required as it's an atomic operation
	if err := svc.Services.CommentService(nil).Create(comment); err != nil {
		return respServiceError(err)
	}

	// Increment page/domain comment counts in the background, ignoring any error
	go func() {
		_ = svc.Services.PageService(nil).IncrementCounts(&page.ID, 1, 0)
		_ = svc.Services.DomainService(nil).IncrementCounts(&domain.ID, 1, 0)
	}()

	// Send an email notification to moderators, if we notify about every comment or comments pending moderation and
	// the comment isn't approved yet, in the background
	if domain.ModNotifyPolicy == data.DomainModNotifyPolicyAll || comment.IsPending && domain.ModNotifyPolicy == data.DomainModNotifyPolicyPending {
		go func() { _ = sendCommentModNotifications(domain, page, comment, user) }()
	}

	// If it's a reply and the comment is approved, send out a reply notifications, in the background
	if !comment.IsRoot() && comment.IsApproved {
		go func() { _ = sendCommentReplyNotifications(domain, page, comment, user) }()
	}

	// Notify websocket subscribers
	commentWebSocketNotify(page, comment, "new")

	// Succeeded
	return api_embed.NewEmbedCommentNewOK().WithPayload(&api_embed.EmbedCommentNewOKBody{
		Comment: comment.ToDTO(domain.IsHTTPS, domain.Host, page.Path),
		Commenter: user.
			CloneWithClearance(user.IsSuperuser, domainUser.IsOwner, domainUser.IsModerator).
			ToCommenter(domainUser.IsCommenter, domainUser.IsModerator),
	})
}

func EmbedCommentPreview(params api_embed.EmbedCommentPreviewParams) middleware.Responder {
	// Extract domain ID
	domainID, r := parseUUID(params.Body.DomainID)
	if r != nil {
		return r
	}

	// Render the passed markdown
	c := &data.Comment{}
	if err := svc.Services.CommentService(nil).SetMarkdown(c, params.Body.Markdown, domainID, nil); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_embed.NewEmbedCommentPreviewOK().WithPayload(&api_embed.EmbedCommentPreviewOKBody{HTML: c.HTML})
}

func EmbedCommentSticky(params api_embed.EmbedCommentStickyParams, user *data.User) middleware.Responder {
	// Find the comment and related objects
	comment, page, _, domainUser, r := commentGetCommentPageDomainUser(params.UUID, &user.ID)
	if r != nil {
		return r
	}

	// Verify the user is a moderator
	if r := Verifier.UserCanModerateDomain(user, domainUser); r != nil {
		return r
	}

	// Verify it's a top-level comment
	if !comment.IsRoot() {
		return respBadRequest(exmodels.ErrorNoRootComment)
	}

	// Update the comment, if necessary
	b := swag.BoolValue(params.Body.Sticky)
	if comment.IsSticky != b {
		if err := svc.Services.CommentService(nil).UpdateSticky(&comment.ID, b); err != nil {
			return respServiceError(err)
		}

		// Notify websocket subscribers
		commentWebSocketNotify(page, comment, "sticky")
	}

	// Succeeded or no change
	return api_embed.NewEmbedCommentStickyNoContent()
}

func EmbedCommentUpdate(params api_embed.EmbedCommentUpdateParams, user *data.User) middleware.Responder {
	// Find the comment and related objects
	comment, page, domain, domainUser, r := commentGetCommentPageDomainUser(params.UUID, &user.ID)
	if r != nil {
		return r
	}

	// Check the user is allowed to update the comment
	if r := Verifier.UserCanUpdateComment(&domain.ID, user, domainUser, comment); r != nil {
		return r
	}

	// If the comment was approved, check the need for moderation again
	unapprove := false
	if !comment.IsPending && comment.IsApproved {
		// Run the approval rules
		if b, s, err := svc.Services.PerlustrationService().NeedsModeration(params.HTTPRequest, comment, domain, page, user, domainUser, true); err != nil {
			return respServiceError(err)
		} else if b {
			unapprove = true
			comment.WithModerated(&user.ID, true, false, s)
		}
	}

	// Update the comment text/HTML
	err := svc.Services.WithTx(func(tx *persistence.DatabaseTx) error {
		cSvc := svc.Services.CommentService(tx)
		if err := cSvc.SetMarkdown(comment, params.Body.Markdown, &domain.ID, &user.ID); err != nil {
			return err
		}
		if err := cSvc.Edited(comment); err != nil {
			return err
		}

		// If the comment approval was revoked
		if unapprove {
			return cSvc.Moderated(comment)
		}
		return nil
	})
	if err != nil {
		return respServiceError(err)
	}

	// Notify websocket subscribers
	commentWebSocketNotify(page, comment, "update")

	// Succeeded
	return api_embed.NewEmbedCommentUpdateOK().
		WithPayload(&api_embed.EmbedCommentUpdateOKBody{
			Comment: comment.ToDTO(domain.IsHTTPS, domain.Host, page.Path),
		})
}

func EmbedCommentVote(params api_embed.EmbedCommentVoteParams, user *data.User) middleware.Responder {
	// Find the comment and the related objects
	comment, page, domain, _, r := commentGetCommentPageDomainUser(params.UUID, &user.ID)
	if r != nil {
		return r
	}

	// Make sure voting is enabled
	if !svc.Services.DomainConfigService(nil).GetBool(&domain.ID, data.DomainConfigKeyEnableCommentVoting) {
		return respForbidden(exmodels.ErrorFeatureDisabled.WithDetails("comment voting"))
	}

	// Make sure the user is not voting for their own comment
	if comment.UserCreated.UUID == user.ID {
		return respForbidden(exmodels.ErrorSelfVote)
	}

	// Update the vote and the comment
	score, err := svc.Services.CommentService(nil).Vote(&comment.ID, &user.ID, *params.Body.Direction)
	if err != nil {
		return respServiceError(err)

	}

	// Notify websocket subscribers
	commentWebSocketNotify(page, comment, "vote")

	// Succeeded
	return api_embed.NewEmbedCommentVoteOK().WithPayload(&api_embed.EmbedCommentVoteOKBody{Score: int64(score)})
}
