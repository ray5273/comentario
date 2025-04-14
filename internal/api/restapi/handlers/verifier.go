package handlers

import (
	"errors"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"github.com/markbates/goth"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"time"
)

// Verifier is a global VerifierService implementation
var Verifier VerifierService = &verifier{}

// VerifierService is an API service interface for data and permission verification
type VerifierService interface {
	// DomainConfigItems verifies the passed config items are valid
	DomainConfigItems(items []*models.DynamicConfigItem) middleware.Responder
	// DomainHostCanBeAdded verifies the given host is valid and not existing yet
	DomainHostCanBeAdded(host string) middleware.Responder
	// DomainPageCanUpdatePathTo verifies the given domain page is allowed to change its path to the provided new value
	DomainPageCanUpdatePathTo(page *data.DomainPage, newPath string) middleware.Responder
	// DomainSSOConfig verifies the given domain is properly configured for SSO authentication
	DomainSSOConfig(domain *data.Domain) middleware.Responder
	// FederatedIdProvider verifies the federated identity provider specified by its ID is properly configured for
	// authentication, and returns the corresponding Provider interface
	FederatedIdProvider(id models.FederatedIdpID) (goth.Provider, middleware.Responder)
	// FederatedIdProviders verifies each federated identity provider is properly configured for authentication
	FederatedIdProviders(ids []models.FederatedIdpID) middleware.Responder
	// IsAnotherUser checks if the given user is not the current user
	IsAnotherUser(curUserID, userID *uuid.UUID) middleware.Responder
	// LocalSignupEnabled checks if users are allowed to sign up locally. If domainID == nil, it's a frontend (Admin UI)
	// sign-up
	LocalSignupEnabled(domainID *uuid.UUID) middleware.Responder
	// UserCanAddDomain checks if the provided user is allowed to register a new domain (and become its owner)
	UserCanAddDomain(user *data.User) middleware.Responder
	// UserCanChangeEmailTo verifies the user can change their email to the new given value
	UserCanChangeEmailTo(user *data.User, newEmail string) middleware.Responder
	// UserCanDeleteComment verifies the given domain user is allowed to delete the specified comment. domainUser can be
	// nil
	UserCanDeleteComment(domainID *uuid.UUID, user *data.User, domainUser *data.DomainUser, comment *data.Comment) middleware.Responder
	// UserCanManageDomain verifies the given user is a superuser or the domain user is a domain owner. domainUser can
	// be nil
	UserCanManageDomain(user *data.User, domainUser *data.DomainUser) middleware.Responder
	// UserCanModerateDomain verifies the given user is a superuser or the domain user is a domain moderator. domainUser
	// can be nil
	UserCanModerateDomain(user *data.User, domainUser *data.DomainUser) middleware.Responder
	// UserCanSignupWithEmail verifies the user can sign up using then given email
	UserCanSignupWithEmail(email string) (*exmodels.Error, middleware.Responder)
	// UserCanUpdateComment verifies the given domain user is allowed to update the specified comment. domainUser can be
	// nil
	UserCanUpdateComment(domainID *uuid.UUID, user *data.User, domainUser *data.DomainUser, comment *data.Comment) middleware.Responder
	// UserCurrentPassword verifies the current user's password is correct. It also has a built-in sleep on a wrong
	// password to discourage brute-force attacks
	UserCurrentPassword(user *data.User, pwd string) middleware.Responder
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

func (v *verifier) DomainConfigItems(items []*models.DynamicConfigItem) middleware.Responder {
	// Iterate every item from the list
	for _, item := range items {
		// Pass the key and the value to the domain config service for validation
		if err := svc.Services.DomainConfigService(nil).ValidateKeyValue(swag.StringValue(item.Key), swag.StringValue(item.Value)); err != nil {
			return respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails(err.Error()))
		}
	}

	// Succeeded
	return nil
}

func (v *verifier) DomainPageCanUpdatePathTo(page *data.DomainPage, newPath string) middleware.Responder {
	// If the path isn't changing, it's always okay
	if page.Path == newPath {
		return nil
	}

	// Try to find an existing page with that path
	if _, err := svc.Services.PageService(nil).FindByDomainPath(&page.DomainID, newPath); err == nil {
		// Path is already used by another page
		return respBadRequest(exmodels.ErrorPagePathAlreadyExists)
	} else if !errors.Is(err, svc.ErrNotFound) {
		// Any database error other than "not found"
		return respServiceError(err)
	}

	// Succeeded
	return nil
}

func (v *verifier) DomainHostCanBeAdded(host string) middleware.Responder {
	// Validate the host
	if ok, _, _ := util.IsValidHostPort(host); !ok {
		logger.Warningf("DomainNew(): '%s' is not a valid host[:port]", host)
		return respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails(host))
	}

	// Make sure domain host isn't taken yet
	if _, err := svc.Services.DomainService(nil).FindByHost(host); err == nil {
		// Domain host already exists in the DB
		return respBadRequest(exmodels.ErrorHostAlreadyExists)
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
		respBadRequest(exmodels.ErrorSSOMisconfigured.WithDetails("SSO isn't enabled"))

		// Verify SSO URL is set
	} else if domain.SSOURL == "" {
		respBadRequest(exmodels.ErrorSSOMisconfigured.WithDetails("SSO URL is missing"))

		// Verify SSO URL is valid and secure (allow insecure in e2e-testing mode)
	} else if _, err := util.ParseAbsoluteURL(domain.SSOURL, config.ServerConfig.E2e, false); err != nil {
		respBadRequest(exmodels.ErrorSSOMisconfigured.WithDetails(err.Error()))

		// Verify SSO secret is encoded properly
	} else if sec, err := domain.SSOSecretBytes(); err != nil {
		respBadRequest(exmodels.ErrorSSOMisconfigured.WithDetails("SSO secret is invalid"))

		// Verify SSO secret is set
	} else if sec == nil {
		respBadRequest(exmodels.ErrorSSOMisconfigured.WithDetails("SSO secret isn't configured"))
	}

	// Succeeded
	return nil
}

func (v *verifier) FederatedIdProvider(id models.FederatedIdpID) (goth.Provider, middleware.Responder) {
	if known, conf, p, _ := config.GetFederatedIdP(id); !known {
		// Provider ID not known
		return nil, respBadRequest(exmodels.ErrorIdPUnknown.WithDetails(string(id)))
	} else if !conf {
		// Provider not configured
		return nil, respBadRequest(exmodels.ErrorIdPUnconfigured.WithDetails(string(id)))
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
		return respBadRequest(exmodels.ErrorSelfOperation)
	}
	return nil
}

func (v *verifier) LocalSignupEnabled(domainID *uuid.UUID) middleware.Responder {
	var item *data.DynConfigItem
	var err error
	if domainID == nil {
		// Frontend signup
		item, err = svc.Services.DynConfigService().Get(data.ConfigKeyAuthSignupEnabled)

	} else {
		// Embed signup
		item, err = svc.Services.DomainConfigService(nil).Get(domainID, data.DomainConfigKeyLocalSignupEnabled)
	}

	// Check for error
	if err != nil {
		return respServiceError(err)
	}

	// If signup is disabled
	if !item.AsBool() {
		return respForbidden(exmodels.ErrorSignupsForbidden)
	}

	// Signup allowed
	return nil
}

func (v *verifier) UserCanAddDomain(user *data.User) middleware.Responder {
	// If the user isn't a superuser and no new owners are allowed
	if !user.IsSuperuser && !svc.Services.DynConfigService().GetBool(data.ConfigKeyOperationNewOwnerEnabled) {
		// Check if this user already owns any domain
		if i, err := svc.Services.DomainService(nil).CountForUser(&user.ID, true, false); err != nil {
			return respServiceError(err)
		} else if i == 0 {
			// Not an owner
			return respForbidden(exmodels.ErrorNewOwnersForbidden)
		}
	}
	return nil
}

func (v *verifier) UserCanChangeEmailTo(user *data.User, newEmail string) middleware.Responder {
	// Make sure the user is local
	if r := v.UserIsLocal(user); r != nil {
		return r
	}

	// Don't bother if the email isn't changing
	if user.Email == newEmail {
		return nil
	}

	// Validate the new email
	if !util.IsValidEmail(newEmail) {
		return respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails("email"))
	}

	// Try to find an existing user by email
	if _, err := svc.Services.UserService(nil).FindUserByEmail(newEmail); errors.Is(err, svc.ErrNotFound) {
		// Success: no such email yet
		return nil
	} else if err != nil {
		// Any other DB error
		return respServiceError(err)
	}

	// Email is already registered
	return respBadRequest(exmodels.ErrorEmailAlreadyExists)
}

func (v *verifier) UserCanDeleteComment(domainID *uuid.UUID, user *data.User, domainUser *data.DomainUser, comment *data.Comment) middleware.Responder {
	// If the user is a moderator+, deletion is controlled by the "moderator deletion" setting
	if (user.IsSuperuser || domainUser.CanModerate()) &&
		svc.Services.DomainConfigService(nil).GetBool(domainID, data.DomainConfigKeyCommentDeletionModerator) {
		return nil
	}

	// If it's the comment author, deletion is controlled by the "author deletion" setting
	if !comment.IsAnonymous() &&
		domainUser != nil &&
		comment.UserCreated.UUID == domainUser.UserID &&
		svc.Services.DomainConfigService(nil).GetBool(domainID, data.DomainConfigKeyCommentDeletionAuthor) {
		return nil
	}

	// Deletion not allowed
	return respForbidden(exmodels.ErrorNotAllowed)
}

func (v *verifier) UserCanManageDomain(user *data.User, domainUser *data.DomainUser) middleware.Responder {
	if user.IsSuperuser || domainUser.IsAnOwner() {
		return nil
	}
	return respForbidden(exmodels.ErrorNotDomainOwner)
}

func (v *verifier) UserCanModerateDomain(user *data.User, domainUser *data.DomainUser) middleware.Responder {
	if user.IsSuperuser || domainUser.CanModerate() {
		return nil
	}
	return respForbidden(exmodels.ErrorNotModerator)
}

func (v *verifier) UserCanSignupWithEmail(email string) (*exmodels.Error, middleware.Responder) {
	// Try to find an existing user by email
	user, err := svc.Services.UserService(nil).FindUserByEmail(email)
	if errors.Is(err, svc.ErrNotFound) {
		// Success: no such email
		return nil, nil
	} else if err != nil {
		// Any other DB error
		return exmodels.ErrorUnknown, respServiceError(err)
	}

	// Email found. If a local account exists
	if user.IsLocal() {
		// Account already exists
		return exmodels.ErrorEmailAlreadyExists, respUnauthorized(exmodels.ErrorEmailAlreadyExists)
	}

	// Existing account is a federated one. If the user logs in via SSO
	if user.FederatedSSO {
		return exmodels.ErrorLoginUsingSSO, respUnauthorized(exmodels.ErrorLoginUsingSSO)
	}

	// User logs in using a federated IdP
	ee := exmodels.ErrorLoginUsingIdP.WithDetails(user.FederatedIdP.String)
	return ee, respUnauthorized(ee)
}

func (v *verifier) UserCanUpdateComment(domainID *uuid.UUID, user *data.User, domainUser *data.DomainUser, comment *data.Comment) middleware.Responder {
	// If the user is a moderator+, editing is controlled by the "moderator editing" setting
	if (user.IsSuperuser || domainUser.CanModerate()) &&
		svc.Services.DomainConfigService(nil).GetBool(domainID, data.DomainConfigKeyCommentEditingModerator) {
		return nil
	}

	// If it's the comment author, editing is controlled by the "author editing" setting
	if !comment.IsAnonymous() &&
		domainUser != nil &&
		comment.UserCreated.UUID == domainUser.UserID &&
		svc.Services.DomainConfigService(nil).GetBool(domainID, data.DomainConfigKeyCommentEditingAuthor) {
		return nil
	}

	// Editing not allowed
	return respForbidden(exmodels.ErrorNotAllowed)
}

func (v *verifier) UserCurrentPassword(user *data.User, pwd string) middleware.Responder {
	if !user.VerifyPassword(pwd) {
		// Sleep a while to discourage brute-force attacks
		time.Sleep(util.WrongAuthDelayMax)
		return respBadRequest(exmodels.ErrorWrongCurPassword)
	}
	return nil
}

func (v *verifier) UserIsAuthenticated(user *data.User) middleware.Responder {
	if user.IsAnonymous() {
		return respUnauthorized(exmodels.ErrorUnauthenticated)
	}
	return nil
}

func (v *verifier) UserIsLocal(user *data.User) middleware.Responder {
	if !user.IsLocal() {
		return respBadRequest(exmodels.ErrorNoLocalUser)
	}
	return nil
}

func (v *verifier) UserIsNotSystem(user *data.User) middleware.Responder {
	if user.SystemAccount {
		return respBadRequest(exmodels.ErrorImmutableAccount)
	}
	return nil
}

func (v *verifier) UserIsSuperuser(user *data.User) middleware.Responder {
	if !user.IsSuperuser {
		return respForbidden(exmodels.ErrorNoSuperuser)
	}
	return nil
}
