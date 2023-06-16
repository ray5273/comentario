package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/markbates/goth"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"strings"
)

// Verifier is a global VerifierService implementation
var Verifier VerifierService = &verifier{}

// VerifierService is an API service interface for data and permission verification
type VerifierService interface {
	// DomainSSOConfig verifies the given domain is properly configured for SSO authentication
	DomainSSOConfig(domain *data.Domain) middleware.Responder
	// FederatedIdProvider verifies the federated identity provider specified by its ID is properly configured for
	// authentication
	FederatedIdProvider(id models.FederatedIdpID) (goth.Provider, middleware.Responder)
	// NeedsModeration returns whether the given comment needs to be moderated
	NeedsModeration(comment *data.Comment, domain *data.Domain, user *data.User, domainUser *data.DomainUser) (bool, error)
	// UserCanAuthenticate checks if the provided user is allowed to authenticate with the backend. requireConfirmed
	// indicates if the user must also have a confirmed email
	UserCanAuthenticate(user *data.User, requireConfirmed bool) (*exmodels.Error, middleware.Responder)
	// UserCanEditDomain verifies the given user is a superuser or the domain user is a domain owner. domainUser can be
	// nil
	UserCanEditDomain(user *data.User, domainUser *data.DomainUser) middleware.Responder
	// UserCanModerateDomain verifies the given user is a superuser or the domain user is a domain moderator. domainUser
	// can be nil
	UserCanModerateDomain(user *data.User, domainUser *data.DomainUser) middleware.Responder
	// UserCanSignupWithEmail verifies the user can sign up locally (using email and password)
	UserCanSignupWithEmail(email string) middleware.Responder
	// UserCanUpdateComment verifies the given domain user is allowed to update the specified comment. domainUser can be
	// nil
	UserCanUpdateComment(user *data.User, domainUser *data.DomainUser, comment *data.Comment) middleware.Responder
	// UserIsAuthenticated verifies the given user is an authenticated one
	UserIsAuthenticated(user *data.User) middleware.Responder
	// UserIsLocal verifies the user is a locally authenticated one
	UserIsLocal(user *data.User) middleware.Responder
}

// ----------------------------------------------------------------------------------------------------------------------
// verifier is a blueprint VerifierService implementation
type verifier struct{}

func (v *verifier) DomainSSOConfig(domain *data.Domain) middleware.Responder {
	// Verify SSO is at all enabled
	if !domain.AuthSSO {
		respBadRequest(ErrorSSOMisconfigured.WithDetails("SSO isn't enabled"))

		// Verify SSO URL is set
	} else if domain.SSOURL == "" {
		respBadRequest(ErrorSSOMisconfigured.WithDetails("SSO URL is missing"))

		// Verify SSO URL is valid and secure
	} else if _, err := util.ParseAbsoluteURL(domain.SSOURL, false); err != nil {
		respBadRequest(ErrorSSOMisconfigured.WithDetails(err.Error()))

		// Verify SSO secret is configured
	} else if !domain.SSOSecretStr().Valid {
		respBadRequest(ErrorSSOMisconfigured.WithDetails("SSO secret isn't configured"))
	}

	// Succeeded
	return nil
}

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

func (v *verifier) NeedsModeration(comment *data.Comment, domain *data.Domain, user *data.User, domainUser *data.DomainUser) (bool, error) {
	// Comments by superusers, owners, and moderators are always pre-approved
	if user.Superuser || domainUser.IsOwner || domainUser.IsModerator {
		return false, nil
	}

	// Check domain moderation settings
	switch user.IsAnonymous() {
	// Authenticated user
	case false:
		// If all authenticated are to be approved
		if domain.ModAuthenticated {
			return true, nil

			// If the user was created less than the required number of days ago
		} else if domainUser.AgeInDays() < domain.ModUserAgeDays {
			return true, nil

			// If there's a number of comments specified for the domain
		} else if domain.ModNumComments > 0 {
			// Verify the user has the required number of approved comments
			if i, err := svc.TheCommentService.CountByDomainUser(&domain.ID, &user.ID, true); err != nil {
				return false, err
			} else if i < domain.ModNumComments {
				return true, nil
			}
		}

	// Anonymous user
	case true:
		if domain.ModAnonymous {
			return true, nil
		}
	}

	// Check link/image moderation policy
	html := strings.ToLower(comment.HTML)
	if domain.ModLinks && strings.Contains(html, "<a") {
		return true, nil
	} else if domain.ModImages && strings.Contains(html, "<img") {
		return true, nil
	}

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
	return false, nil
}

func (v *verifier) UserCanAuthenticate(user *data.User, requireConfirmed bool) (*exmodels.Error, middleware.Responder) {
	switch {
	// Only non-system, non-anonymous users may login
	case user.SystemAccount || user.IsAnonymous():
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

func (v *verifier) UserCanEditDomain(user *data.User, domainUser *data.DomainUser) middleware.Responder {
	if !user.Superuser && (domainUser == nil || !domainUser.IsOwner) {
		return respForbidden(ErrorNotDomainOwner)
	}
	return nil
}

func (v *verifier) UserCanModerateDomain(user *data.User, domainUser *data.DomainUser) middleware.Responder {
	if !user.Superuser && (domainUser == nil || (!domainUser.IsOwner && !domainUser.IsModerator)) {
		return respForbidden(ErrorNotModerator)
	}
	return nil
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

func (v *verifier) UserCanUpdateComment(user *data.User, domainUser *data.DomainUser, comment *data.Comment) middleware.Responder {
	// If no domain user provided, it's a fail
	if domainUser == nil {
		return respForbidden(ErrorNotModerator)
	}

	// If the user doesn't own the comment, they must be a domain moderator
	if comment.IsAnonymous() || comment.UserCreated.UUID != domainUser.UserID {
		if r := v.UserCanModerateDomain(user, domainUser); r != nil {
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
