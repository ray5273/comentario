package handlers

import (
	"errors"
	"github.com/go-openapi/runtime/middleware"
	"github.com/google/uuid"
	"github.com/markbates/goth"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
)

// Verifier is a global VerifierService implementation
var Verifier VerifierService = &verifier{}

// VerifierService is an API service interface for data and permission verification
type VerifierService interface {
	// DomainHostCanBeAdded verifies the given host is valid and not existing yet
	DomainHostCanBeAdded(host string) middleware.Responder
	// DomainSSOConfig verifies the given domain is properly configured for SSO authentication
	DomainSSOConfig(domain *data.Domain) middleware.Responder
	// FederatedIdProvider verifies the federated identity provider specified by its ID is properly configured for
	// authentication, and returns the corresponding Provider interface
	FederatedIdProvider(id models.FederatedIdpID) (goth.Provider, middleware.Responder)
	// FederatedIdProviders verifies each federated identity provider is properly configured for authentication
	FederatedIdProviders(ids []models.FederatedIdpID) middleware.Responder
	// IsAnotherUser checks if the given user is not the current user
	IsAnotherUser(curUserID, userID *uuid.UUID) middleware.Responder
	// LocalSignupEnabled checks if users are allowed to sign up locally. embed indicates whether it's about commenter sign-up
	LocalSignupEnabled(embed bool) middleware.Responder
	// UserCanAddDomain checks if the provided user is allowed to register a new domain (and become its owner)
	UserCanAddDomain(user *data.User) middleware.Responder
	// UserCanAuthenticate checks if the provided user is allowed to authenticate with the backend. requireConfirmed
	// indicates if the user must also have a confirmed email
	UserCanAuthenticate(user *data.User, requireConfirmed bool) (*exmodels.Error, middleware.Responder)
	// UserCanDeleteComment verifies the given domain user is allowed to delete the specified comment. domainUser can be
	// nil
	UserCanDeleteComment(domainID *uuid.UUID, user *data.User, domainUser *data.DomainUser, comment *data.Comment) middleware.Responder
	// UserCanManageDomain verifies the given user is a superuser or the domain user is a domain owner. domainUser can
	// be nil
	UserCanManageDomain(user *data.User, domainUser *data.DomainUser) middleware.Responder
	// UserCanModerateDomain verifies the given user is a superuser or the domain user is a domain moderator. domainUser
	// can be nil
	UserCanModerateDomain(user *data.User, domainUser *data.DomainUser) middleware.Responder
	// UserCanSignupWithEmail verifies the user can sign up locally (using email and password)
	UserCanSignupWithEmail(email string) middleware.Responder
	// UserCanUpdateComment verifies the given domain user is allowed to update the specified comment. domainUser can be
	// nil
	UserCanUpdateComment(domainID *uuid.UUID, user *data.User, domainUser *data.DomainUser, comment *data.Comment) middleware.Responder
	// UserIsAuthenticated verifies the given user is an authenticated one
	UserIsAuthenticated(user *data.User) middleware.Responder
	// UserIsLocal verifies the user is a locally authenticated one
	UserIsLocal(user *data.User) middleware.Responder
	// UserIsNotSystem verifies the user isn't a system account
	UserIsNotSystem(user *data.User) middleware.Responder
	// UserIsSuperuser verifies the given user is a superuser
	UserIsSuperuser(user *data.User) middleware.Responder
}

// ----------------------------------------------------------------------------------------------------------------------
// verifier is a blueprint VerifierService implementation
type verifier struct{}

func (v *verifier) DomainHostCanBeAdded(host string) middleware.Responder {
	// Validate the host
	if ok, _, _ := util.IsValidHostPort(host); !ok {
		logger.Warningf("DomainNew(): '%s' is not a valid host[:port]", host)
		return respBadRequest(ErrorInvalidPropertyValue.WithDetails(host))
	}

	// Make sure domain host isn't taken yet
	if _, err := svc.TheDomainService.FindByHost(host); err == nil {
		// Domain host already exists in the DB
		return respBadRequest(ErrorHostAlreadyExists)
	} else if !errors.Is(err, svc.ErrNotFound) {
		// Any database error other than "not found"
		return respServiceError(err)
	}

	// Succeeded
	return nil
}

func (v *verifier) DomainSSOConfig(domain *data.Domain) middleware.Responder {
	// Verify SSO is at all enabled
	if !domain.AuthSSO {
		respBadRequest(ErrorSSOMisconfigured.WithDetails("SSO isn't enabled"))

		// Verify SSO URL is set
	} else if domain.SSOURL == "" {
		respBadRequest(ErrorSSOMisconfigured.WithDetails("SSO URL is missing"))

		// Verify SSO URL is valid and secure (allow insecure in e2e-testing mode)
	} else if _, err := util.ParseAbsoluteURL(domain.SSOURL, config.CLIFlags.E2e, false); err != nil {
		respBadRequest(ErrorSSOMisconfigured.WithDetails(err.Error()))

		// Verify SSO secret is configured
	} else if !domain.SSOSecretStr().Valid {
		respBadRequest(ErrorSSOMisconfigured.WithDetails("SSO secret isn't configured"))
	}

	// Succeeded
	return nil
}

func (v *verifier) FederatedIdProvider(id models.FederatedIdpID) (goth.Provider, middleware.Responder) {
	if known, conf, p, _ := data.GetFederatedIdP(id); !known {
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

func (v *verifier) FederatedIdProviders(ids []models.FederatedIdpID) middleware.Responder {
	// Iterate the IDs
	for _, id := range ids {
		// Exit on the first error
		if _, r := v.FederatedIdProvider(id); r != nil {
			return r
		}
	}

	// Succeeded
	return nil
}

func (v *verifier) IsAnotherUser(curUserID, userID *uuid.UUID) middleware.Responder {
	if *curUserID == *userID {
		return respBadRequest(ErrorSelfOperation)
	}
	return nil
}

func (v *verifier) LocalSignupEnabled(embed bool) middleware.Responder {
	if i, err := svc.TheDynConfigService.Get(util.If(embed, data.ConfigKeyDomainDefaultsLocalSignupEnabled, data.ConfigKeyAuthSignupEnabled)); err != nil {
		return respServiceError(err)
	} else if !i.AsBool() {
		return respForbidden(ErrorSignupsForbidden)
	}
	return nil
}

func (v *verifier) UserCanAddDomain(user *data.User) middleware.Responder {
	// If the user isn't a superuser
	if !user.IsSuperuser {
		// Check if new owners are allowed
		if !svc.TheDynConfigService.GetBool(data.ConfigKeyOperationNewOwnerEnabled) {
			// No new owners allowed: verify this user already owns at least one domain
			if i, err := svc.TheDomainService.CountForUser(&user.ID, true, false); err != nil {
				return respServiceError(err)
			} else if i == 0 {
				return respForbidden(ErrorNewOwnersForbidden)
			}
		}
	}
	return nil
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

func (v *verifier) UserCanDeleteComment(domainID *uuid.UUID, user *data.User, domainUser *data.DomainUser, comment *data.Comment) middleware.Responder {
	// If the user is a moderator+, deletion is controlled by the "moderator deletion" setting
	if (user.IsSuperuser || domainUser.CanModerate()) &&
		svc.TheDomainConfigService.GetBool(domainID, data.DomainConfigKeyCommentDeletionModerator) {
		return nil
	}

	// If it's the comment author, deletion is controlled by the "author deletion" setting
	if !comment.IsAnonymous() &&
		domainUser != nil &&
		comment.UserCreated.UUID == domainUser.UserID &&
		svc.TheDomainConfigService.GetBool(domainID, data.DomainConfigKeyCommentDeletionAuthor) {
		return nil
	}

	// Deletion not allowed
	return respForbidden(ErrorNotAllowed)
}

func (v *verifier) UserCanManageDomain(user *data.User, domainUser *data.DomainUser) middleware.Responder {
	if !user.IsSuperuser && (domainUser == nil || !domainUser.IsOwner) {
		return respForbidden(ErrorNotDomainOwner)
	}
	return nil
}

func (v *verifier) UserCanModerateDomain(user *data.User, domainUser *data.DomainUser) middleware.Responder {
	if user.IsSuperuser || domainUser.CanModerate() {
		return nil
	}
	return respForbidden(ErrorNotModerator)
}

func (v *verifier) UserCanSignupWithEmail(email string) middleware.Responder {
	// Try to find an existing user by email
	user, err := svc.TheUserService.FindUserByEmail(email, false)
	if errors.Is(err, svc.ErrNotFound) {
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

	// Existing account is a federated one. If the user logs in via SSO
	if user.FederatedSSO {
		return respUnauthorized(ErrorLoginUsingSSO)
	}

	// User logs in using a federated IdP
	return respUnauthorized(ErrorLoginUsingIdP.WithDetails(user.FederatedIdP))
}

func (v *verifier) UserCanUpdateComment(domainID *uuid.UUID, user *data.User, domainUser *data.DomainUser, comment *data.Comment) middleware.Responder {
	// If the user is a moderator+, editing is controlled by the "moderator editing" setting
	if (user.IsSuperuser || domainUser.CanModerate()) &&
		svc.TheDomainConfigService.GetBool(domainID, data.DomainConfigKeyCommentEditingModerator) {
		return nil
	}

	// If it's the comment author, editing is controlled by the "author editing" setting
	if !comment.IsAnonymous() &&
		domainUser != nil &&
		comment.UserCreated.UUID == domainUser.UserID &&
		svc.TheDomainConfigService.GetBool(domainID, data.DomainConfigKeyCommentEditingAuthor) {
		return nil
	}

	// Editing not allowed
	return respForbidden(ErrorNotAllowed)
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

func (v *verifier) UserIsNotSystem(user *data.User) middleware.Responder {
	if user.SystemAccount {
		return respBadRequest(ErrorImmutableAccount)
	}
	return nil
}

func (v *verifier) UserIsSuperuser(user *data.User) middleware.Responder {
	if !user.IsSuperuser {
		return respForbidden(ErrorNoSuperuser)
	}
	return nil
}
