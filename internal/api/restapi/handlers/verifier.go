package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/markbates/goth"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
)

// Verifier is a global VerifierService implementation
var Verifier VerifierService = &verifier{}

// VerifierService is an API service interface for data and permission verification
type VerifierService interface {
	// FederatedIdProvider verifies the federated identity provider specified by its ID is properly configured for
	// authentication
	FederatedIdProvider(id models.FederatedIdpID) (goth.Provider, middleware.Responder)
	// NeedsModeration returns whether the given comment needs to be moderated
	NeedsModeration(comment *data.Comment, domain *data.Domain, user *data.User, domainUser *data.DomainUser) bool
	// UserCanAuthenticate checks if the provided user is allowed to authenticate with the backend. requireConfirmed
	// indicates if the user must also have a confirmed email
	UserCanAuthenticate(user *data.User, requireConfirmed bool) (*exmodels.Error, middleware.Responder)
	// UserCanSignupWithEmail verifies the user can sign up locally (using email and password)
	UserCanSignupWithEmail(email string) middleware.Responder
	// UserCanUpdateComment verifies the given domain user is allowed to update the specified comment. domainUser can be
	// nil
	UserCanUpdateComment(comment *data.Comment, domainUser *data.DomainUser) middleware.Responder
	// UserIsAuthenticated verifies the given user is an authenticated one
	UserIsAuthenticated(user *data.User) middleware.Responder
	// UserIsLocal verifies the user is a locally authenticated one
	UserIsLocal(user *data.User) middleware.Responder
	// UserIsModerator verifies the given domain user is a moderator. domainUser can be nil
	UserIsModerator(domainUser *data.DomainUser) middleware.Responder
	// UserOwnsDomain verifies the given domain user is an owner. domainUser can be nil
	UserOwnsDomain(domainUser *data.DomainUser) middleware.Responder
}

// ----------------------------------------------------------------------------------------------------------------------
// verifier is a blueprint VerifierService implementation
type verifier struct{}

func (v *verifier) FederatedIdProvider(id models.FederatedIdpID) (goth.Provider, middleware.Responder) {
	if known, conf, p := data.GetFederatedIdP(id); !known {
		// Provider ID not known
		return nil, respBadRequest(ErrorIdPUnknown.WithDetails(string(id)))
	} else if !conf {
		// Provider not configured
		return nil, respBadRequest(ErrorIdPUnconfigured.WithDetails(string(id)))
	} else {
		// Succeeded
		return p, nil
	}
}

func (v *verifier) NeedsModeration(comment *data.Comment, domain *data.Domain, user *data.User, domainUser *data.DomainUser) bool {
	// Comments by moderators are always pre-approved
	if domainUser.IsModerator {
		return false
	}

	// Check domain moderation settings
	switch user.IsAnonymous() {
	// Authenticated user
	case false:
		if domain.ModAuthenticated {
			return true
		}
	// Anonymous user
	case true:
		if domain.ModAnonymous {
			return true
		}
	}

	// TODO new-db check link and image moderation policies

	// TODO new-db if domain.AutoSpamFilter &&
	//	svc.TheAntispamService.CheckForSpam(
	//		domain.Host,
	//		util.UserIP(params.HTTPRequest),
	//		util.UserAgent(params.HTTPRequest),
	//		commenter.Name,
	//		commenter.Email,
	//		commenter.WebsiteURL,
	//		markdown,
	//	) {
	//	state = models.CommentStateFlagged
	return false
}

func (v *verifier) UserCanAuthenticate(user *data.User, requireConfirmed bool) (*exmodels.Error, middleware.Responder) {
	switch {
	// Only non-system users may login
	case user.SystemAccount:
		return ErrorInvalidCredentials, respUnauthorized(ErrorInvalidCredentials)

	// Check if the user is banned
	case user.Banned:
		return ErrorUserBanned, respForbidden(ErrorUserBanned)

	// If required, check if the user has confirmed their email
	case requireConfirmed && !user.Confirmed:
		return ErrorEmailNotConfirmed, respForbidden(ErrorEmailNotConfirmed)
	}

	// Succeeded
	return nil, nil
}

func (v *verifier) UserCanSignupWithEmail(email string) middleware.Responder {
	// Try to find an existing user by email
	user, err := svc.TheUserService.FindUserByEmail(email, false)
	if err == svc.ErrNotFound {
		// Success: no such email
		return nil
	} else if err != nil {
		// Any other DB error
		return respServiceError(err)
	}

	// Email found. If a local account exists
	if user.IsLocal() {
		// Account already exists
		return respUnauthorized(ErrorEmailAlreadyExists)
	}

	// Existing account is a federated one
	return respUnauthorized(ErrorLoginUsingIdP.WithDetails(user.FederatedIdP))
}

func (v *verifier) UserCanUpdateComment(comment *data.Comment, domainUser *data.DomainUser) middleware.Responder {
	// If no domain user provided, it's a fail
	if domainUser == nil {
		return respForbidden(ErrorNotModerator)
	}

	// If the user doesn't own the comment, they must be a domain moderator
	if comment.IsAnonymous() || comment.UserCreated.UUID != domainUser.UserID {
		if r := v.UserIsModerator(domainUser); r != nil {
			return r
		}
	}
	return nil
}

func (v *verifier) UserIsAuthenticated(user *data.User) middleware.Responder {
	if user.IsAnonymous() {
		return respUnauthorized(ErrorUnauthenticated)
	}
	return nil
}

func (v *verifier) UserIsLocal(user *data.User) middleware.Responder {
	if !user.IsLocal() {
		return respBadRequest(ErrorNoLocalUser)
	}
	return nil
}

func (v *verifier) UserIsModerator(domainUser *data.DomainUser) middleware.Responder {
	if domainUser == nil || (!domainUser.IsOwner && !domainUser.IsModerator) {
		return respForbidden(ErrorNotModerator)
	}
	return nil
}

func (v *verifier) UserOwnsDomain(domainUser *data.DomainUser) middleware.Responder {
	if domainUser == nil || !domainUser.IsOwner {
		return respForbidden(ErrorNotDomainOwner)
	}
	return nil
}
