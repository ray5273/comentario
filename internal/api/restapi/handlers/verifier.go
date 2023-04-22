package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
)

// Verifier is a global VerifierService implementation
var Verifier VerifierService = &verifier{}

// VerifierService is an API service interface for data and permission verification
type VerifierService interface {
	// CommenterLocalEmaiUnique verifies there's no existing commenter  user using the password authentication with the
	// given email
	CommenterLocalEmaiUnique(email string) middleware.Responder
	// UserCanAuthenticate checks if the provided user is allowed to authenticate with the backend. requireConfirmed
	// indicates if the user must also have a confirmed email
	UserCanAuthenticate(user *data.User, requireConfirmed bool) (*exmodels.Error, middleware.Responder)
	// UserIsAuthenticated verifies the given user is an authenticated one
	UserIsAuthenticated(user *data.User) middleware.Responder
	// UserIsDomainModerator verifies the owner with the given email is a moderator in the specified domain
	UserIsDomainModerator(email string, host models.Host) middleware.Responder
	// UserOwnsDomain verifies the owner with the given hex ID owns the specified domain
	UserOwnsDomain(id models.HexID, host models.Host) middleware.Responder
}

// ----------------------------------------------------------------------------------------------------------------------
// verifier is a blueprint VerifierService implementation
type verifier struct{}

func (v *verifier) CommenterLocalEmaiUnique(email string) middleware.Responder {
	// Verify no such email is registered yet
	if _, err := svc.TheUserService.FindCommenterByIdPEmail("", email, false); err == nil {
		return respBadRequest(ErrorEmailAlreadyExists)
	} else if err != svc.ErrNotFound {
		return respServiceError(err)
	}
	return nil
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

func (v *verifier) UserIsDomainModerator(email string, host models.Host) middleware.Responder {
	if b, err := svc.TheDomainService.IsDomainModerator(email, host); err != nil {
		return respServiceError(err)
	} else if !b {
		return respForbidden(ErrorNotModerator)
	}
	return nil
}

func (v *verifier) UserOwnsDomain(id models.HexID, host models.Host) middleware.Responder {
	if b, err := svc.TheDomainService.IsDomainOwner(id, host); err != nil {
		return respServiceError(err)
	} else if !b {
		return respForbidden(ErrorNotDomainOwner)
	}
	return nil
}
