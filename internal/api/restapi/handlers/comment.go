package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_commenter"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"strings"
)

func CommentApprove(params api_commenter.CommentApproveParams, user *data.User) middleware.Responder {
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
	if err = svc.TheCommentService.Approve(comment.CommentHex); err != nil {
		return respServiceError(err)
	}
	*/
	// Succeeded
	return api_commenter.NewCommentApproveNoContent()
}

func CommentCount(params api_commenter.CommentCountParams) middleware.Responder {
	// Fetch comment counts
	cc, err := svc.ThePageService.CommentCounts(params.Body.Host, params.Body.Paths)
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
	/* TODO new-db

	// Find the comment
	comment, err := svc.TheCommentService.FindByHexID(*params.Body.CommentHex)
	if err != nil {
		return respServiceError(err)
	}

	// If not deleting their own comment, the user must be a domain moderator
	if comment.CommenterHex != principal.GetHexID() {
		if r := Verifier.UserIsDomainModerator(principal.GetUser().Email, comment.Host); r != nil {
			return r
		}
	}

	// Mark the comment deleted
	if err = svc.TheCommentService.MarkDeleted(comment.CommentHex, principal.GetHexID()); err != nil {
		return respServiceError(err)
	}
	*/
	// Succeeded
	return api_commenter.NewCommentDeleteNoContent()
}

func CommentEdit(params api_commenter.CommentEditParams, user *data.User) middleware.Responder {
	// Verify the commenter is authenticated
	if r := Verifier.UserIsAuthenticated(user); r != nil {
		return r
	}

	/* TODO new-db
	// Find the existing comment
	comment, err := svc.TheCommentService.FindByHexID(*params.Body.CommentHex)
	if err != nil {
		return respServiceError(err)
	}

	// If not updating their own comment, the user must be a domain moderator
	if comment.CommenterHex != principal.GetHexID() {
		if r := Verifier.UserIsDomainModerator(principal.GetUser().Email, comment.Host); r != nil {
			return r
		}
	}

	// Render the comment into HTML
	markdown := swag.StringValue(params.Body.Markdown)
	html := util.MarkdownToHTML(markdown)

	// Persist the edits in the database
	if err := svc.TheCommentService.UpdateText(comment.CommentHex, markdown, html); err != nil {
		return respServiceError(err)
	}
	*/
	// Succeeded
	return api_commenter.NewCommentEditOK() //.WithPayload(&api_commenter.CommentEditOKBody{HTML: html})
}

func CommentList(params api_commenter.CommentListParams, user *data.User) middleware.Responder {
	/* TODO new-db
	// Fetch the domain
	domain, err := svc.TheDomainService.FindByHost(params.Body.Host)
	if err == svc.ErrNotFound {
		// No domain found for this host
		return respForbidden(ErrorUnknownHost)
	} else if err != nil {
		return respServiceError(err)
	}

	// Fetch the page
	page, err := svc.ThePageService.FindByHostPath(domain.Host, params.Body.Path)
	if err != nil {
		return respServiceError(err)
	}

	// Prepare a map of configured identity providers: federated ones should only be enabled when configured
	var ids []models.IdentityProviderID
	for _, id := range domain.Idps {
		// If it's a federated IdP
		if fidp, ok := data.FederatedIdProviders[id]; ok {
			// If it isn't configured, skip it over
			if _, err := goth.GetProvider(fidp.GothID); err != nil {
				continue
			}
		}

		// Add it to the list otherwise
		ids = append(ids, id)
	}

	// Make a map of moderator emails, also figure out if the user is a moderator self
	moderatorEmailMap := map[strfmt.Email]bool{}
	for _, mod := range domain.Moderators {
		moderatorEmailMap[mod.Email] = true
		if !user.IsAnonymous() && string(mod.Email) == user.Email {
			commenter.IsModerator = true
		}
	}

	// Fetch comment list
	comments, commenters, err := svc.TheCommentService.ListWithCommentersByHostPath(commenter, domain.Host, params.Body.Path)
	if err != nil {
		return respServiceError(err)
	}

	// Update each commenter
	for _, cr := range commenters {
		// Set the IsModerator flag to true for domain moderators
		if moderatorEmailMap[cr.Email] {
			cr.IsModerator = true
		}

		// Wipe out the email (to omit them in the response)
		cr.Email = ""
	}

	// Register a view in domain statistics, ignoring any error
	_ = svc.TheDomainService.RegisterView(domain.Host, commenter)
	*/

	// Succeeded
	return api_commenter.NewCommentListOK() /* TODO new-db.WithPayload(&api_commenter.CommentListOKBody{
		Attributes:            page,
		Commenters:            commenters,
		Comments:              comments,
		Idps:                  ids,
		DefaultSortPolicy:     domain.DefaultSortPolicy,
		Host:                  domain.Host,
		IsFrozen:              domain.State == models.DomainStateFrozen,
		IsModerator:           commenter.IsModerator,
		RequireIdentification: domain.RequireIdentification,
		RequireModeration:     domain.RequireModeration,
	})*/
}

func CommentNew(params api_commenter.CommentNewParams, user *data.User) middleware.Responder {
	// Fetch the domain
	domain, err := svc.TheDomainService.FindByHost(params.Body.Host)
	if err != nil {
		return respServiceError(err)
	}

	// If the domain disallows anonymous commenting, verify the commenter is authenticated
	if domain.RequireIdentification {
		if r := Verifier.UserIsAuthenticated(user); r != nil {
			return r
		}
	}

	// Verify the domain isn't frozen
	if domain.State == models.DomainStateFrozen {
		return respBadRequest(ErrorDomainFrozen)
	}

	// Verify the page isn't locked
	path := strings.TrimSpace(params.Body.Path)
	if page, err := svc.ThePageService.FindByHostPath(domain.Host, path); err != nil {
		return respServiceError(err)
	} else if page.IsLocked {
		return respBadRequest(ErrorPageLocked)
	}

	/* TODO new-db
	// If the commenter is authenticated, check if it's a domain moderator
	commenter := principal.(*data.UserCommenter)
	if !commenter.IsAnonymous() {
		for _, mod := range domain.Moderators {
			if string(mod.Email) == commenter.Email {
				commenter.IsModerator = true
				break
			}
		}
	}

	// Determine comment state
	markdown := data.TrimmedString(params.Body.Markdown)
	var state models.CommentState
	if commenter.IsModerator {
		state = models.CommentStateApproved
	} else if domain.RequireModeration || commenter.IsAnonymous() && domain.ModerateAllAnonymous {
		state = models.CommentStateUnapproved
	} else if domain.AutoSpamFilter &&
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
	} else {
		state = models.CommentStateApproved
	}

	// Persist a new comment record
	comment, err := svc.TheCommentService.Create(
		commenter.HexID,
		domain.Host,
		path,
		markdown,
		*params.Body.ParentHex,
		state,
		strfmt.DateTime(time.Now().UTC()))
	if err != nil {
		return respServiceError(err)
	}

	// Send out an email notification
	go emailNotificationNew(domain, comment)
	*/
	// Succeeded

	return api_commenter.NewCommentNewOK() /* TODO new-db.WithPayload(&api_commenter.CommentNewOKBody{
		CommenterHex: commenter.HexID,
		CommentHex:   comment.CommentHex,
		HTML:         comment.HTML,
		State:        state,
	})*/
}

func CommentVote(params api_commenter.CommentVoteParams, user *data.User) middleware.Responder {
	// Verify the commenter is authenticated
	if r := Verifier.UserIsAuthenticated(user); r != nil {
		return r
	}

	/* TODO new-db
	// Calculate the direction
	direction := 0
	if *params.Body.Direction > 0 {
		direction = 1
	} else if *params.Body.Direction < 0 {
		direction = -1
	}

	// Find the comment
	comment, err := svc.TheCommentService.FindByHexID(*params.Body.CommentHex)
	if err != nil {
		return respServiceError(err)
	}

	// Make sure the commenter is not voting for their own comment
	if comment.CommenterHex == principal.GetHexID() {
		return respForbidden(ErrorSelfVote)
	}

	// Update the vote in the database
	if err := svc.TheVoteService.SetVote(comment.CommentHex, principal.GetHexID(), direction); err != nil {
		return respServiceError(err)
	}
	*/
	// Succeeded
	return api_commenter.NewCommentVoteNoContent()
}
