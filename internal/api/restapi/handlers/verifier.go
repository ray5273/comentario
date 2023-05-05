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
	// UserCanAuthenticate checks if the provided user is allowed to authenticate with the backend. requireConfirmed
	// indicates if the user must also have a confirmed email
	UserCanAuthenticate(user *data.User, requireConfirmed bool) (*exmodels.Error, middleware.Responder)
	// UserIsAuthenticated verifies the given user is an authenticated one
	UserIsAuthenticated(user *data.User) middleware.Responder
	// UserIsDomainModerator verifies the owner with the given email is a moderator in the specified domain
	UserIsDomainModerator(email string, host models.Host) middleware.Responder
	// UserIsLocal verifies the user is a locally authenticated one
	UserIsLocal(user *data.User) middleware.Responder
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

func (v *verifier) UserIsDomainModerator(email string, host models.Host) middleware.Responder {
	if b, err := svc.TheDomainService.IsDomainModerator(email, host); err != nil {
		return respServiceError(err)
	} else if !b {
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
