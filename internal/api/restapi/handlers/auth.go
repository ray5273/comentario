package handlers

import (
	"errors"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"net/http"
	"strings"
)

// PrincipalResponder is an interface for a responder with the SetPayload method for returning a principal
type PrincipalResponder interface {
	middleware.Responder
	SetPayload(*models.Principal)
}

func AuthConfirm(_ api_general.AuthConfirmParams, user *data.User) middleware.Responder {
	// Don't bother if the user is already confirmed
	if !user.Confirmed {
		// Update the user
		if err := svc.Services.UserService(nil).ConfirmUser(user); err != nil {
			return respServiceError(err)
		}
	}

	// Determine the redirect location: if there's a signup URL, use it
	loc := user.SignupHost
	if loc == "" {
		// Redirect to the UI login page otherwise
		loc = svc.Services.I18nService().FrontendURL(user.LangID, "auth/login", map[string]string{"confirmed": "true"})
	}

	// Redirect the user's browser
	return api_general.NewAuthConfirmTemporaryRedirect().WithLocation(loc)
}

func AuthDeleteProfile(params api_general.AuthDeleteProfileParams, user *data.User) middleware.Responder {
	// If the current user is a superuser, make sure there are others
	if user.IsSuperuser {
		if cnt, err := svc.Services.UserService(nil /* TODO */).CountUsers(true, false, false, true, true); err != nil {
			return respServiceError(err)
		} else if cnt <= 1 {
			return respBadRequest(exmodels.ErrorDeletingLastSuperuser)
		}
	}

	// Figure out which domains the user owns
	var ownedDomains []*data.Domain
	if ds, dus, err := svc.Services.DomainService(nil /* TODO */).ListByDomainUser(&user.ID, &user.ID, false, true, "", "", data.SortAsc, -1); err != nil {
		return respServiceError(err)
	} else {
		for _, du := range dus {
			if du.IsOwner {
				for _, d := range ds {
					if d.ID == du.DomainID {
						ownedDomains = append(ownedDomains, d)
						break
					}
				}
			}
		}
	}

	// If the user owns domains, make sure there are other owners in each of them
	var toBeOrphaned []string
	if len(ownedDomains) > 0 {
		// Figure out which domains have no other owners
		for _, d := range ownedDomains {
			hasOtherOwners := false
			_, dus, err := svc.Services.UserService(nil /* TODO */).ListByDomain(&d.ID, false, "", "", data.SortAsc, -1)
			if err != nil {
				return respServiceError(err)
			}
			for _, du := range dus {
				if du.IsOwner && du.UserID != user.ID {
					hasOtherOwners = true
					break
				}
			}

			// If no other owner is found
			if !hasOtherOwners {
				toBeOrphaned = append(toBeOrphaned, d.Host)
			}
		}
	}

	// Verify none are to be orphaned
	if len(toBeOrphaned) > 0 {
		return respBadRequest(exmodels.ErrorDeletingLastOwner.WithDetails(strings.Join(toBeOrphaned, ", ")))
	}

	// Delete the user, optionally deleting their comments
	if cntDel, err := svc.Services.UserService(nil /* TODO */).DeleteUserByID(user, params.Body.DeleteComments, params.Body.PurgeComments); err != nil {
		return respServiceError(err)
	} else {
		// Succeeded
		return api_general.NewAuthDeleteProfileOK().
			WithPayload(&api_general.AuthDeleteProfileOKBody{CountDeletedComments: cntDel})
	}
}

// AuthLogin logs a user in using local authentication (email and password)
func AuthLogin(params api_general.AuthLoginParams) middleware.Responder {
	// Log the user in
	user, us, r := loginLocalUser(
		data.EmailPtrToString(params.Body.Email),
		swag.StringValue(params.Body.Password),
		"",
		params.HTTPRequest)
	if r != nil {
		return r
	}

	// Succeeded. Return a principal and a session cookie
	return authAddUserSessionToResponse(api_general.NewAuthLoginOK(), user, us)
}

func AuthLoginTokenNew(_ api_general.AuthLoginTokenNewParams) middleware.Responder {
	// Create an anonymous login token
	t, err := authCreateLoginToken(nil)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewAuthLoginTokenNewOK().WithPayload(&api_general.AuthLoginTokenNewOKBody{Token: t.Value})
}

func AuthLoginTokenRedeem(params api_general.AuthLoginTokenRedeemParams, user *data.User) middleware.Responder {
	// Verify the user can log in and create a new session
	us, r := loginUser(user, "", params.HTTPRequest)
	if r != nil {
		return r
	}

	// Succeeded. Return a principal and a session cookie
	return authAddUserSessionToResponse(api_general.NewAuthLoginTokenRedeemOK(), user, us)
}

func AuthLogout(params api_general.AuthLogoutParams, _ *data.User) middleware.Responder {
	// Extract session from the cookie
	_, sessionID, err := svc.Services.AuthService(nil /* TODO */).FetchUserSessionIDFromCookie(params.HTTPRequest)
	if err != nil {
		return respUnauthorized(nil)
	}

	// Delete the session token, ignoring any error
	_ = svc.Services.UserService(nil /* TODO */).DeleteUserSession(sessionID)

	// Regardless of whether the above was successful, return a success response, removing the session cookie
	return NewCookieResponder(api_general.NewAuthLogoutNoContent()).WithoutCookie(util.CookieNameUserSession, "/")
}

func AuthPwdResetChange(params api_general.AuthPwdResetChangeParams, user *data.User) middleware.Responder {
	// Verify it's a local user
	if r := Verifier.UserIsLocal(user); r != nil {
		return r
	}

	// Update the user's password
	if err := svc.Services.UserService(nil /* TODO */).Update(user.WithPassword(data.PasswordPtrToString(params.Body.Password))); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewAuthPwdResetChangeNoContent()
}

func AuthPwdResetSendEmail(params api_general.AuthPwdResetSendEmailParams) middleware.Responder {
	// Find the user with that email
	user, err := svc.Services.UserService(nil /* TODO */).FindUserByEmail(data.EmailPtrToString(params.Body.Email))
	if errors.Is(err, svc.ErrNotFound) || err == nil && !user.IsLocal() {
		// No such email: apply a random delay to discourage email polling
		util.RandomSleep(util.WrongAuthDelayMin, util.WrongAuthDelayMax)

	} else if err != nil {
		// Any other error
		return respServiceError(err)

		// User found. Check if the account is locked
	} else if user.IsLocked {
		return respForbidden(exmodels.ErrorUserLocked)

		// Generate a random password-reset token
	} else if token, err := data.NewToken(&user.ID, data.TokenScopeResetPassword, util.UserPwdResetDuration, false); err != nil {
		return respServiceError(err)

		// Persist the token
	} else if err := svc.Services.TokenService(nil).Create(token); err != nil {
		return respServiceError(err)

		// Send out an email
	} else if err := svc.Services.MailService().SendPasswordReset(user, token); err != nil {
		return respServiceError(err)
	}

	// Succeeded (or no user found)
	return api_general.NewAuthPwdResetSendEmailNoContent()
}

func AuthSignup(params api_general.AuthSignupParams) middleware.Responder {
	// Verify new users are allowed
	if r := Verifier.LocalSignupEnabled(nil); r != nil {
		return r
	}

	// Verify no such email is registered yet
	email := data.EmailPtrToString(params.Body.Email)
	if _, r := Verifier.UserCanSignupWithEmail(email); r != nil {
		return r
	}

	// Create a new user
	user := data.NewUser(email, data.TrimmedString(params.Body.Name)).
		WithLangFromReq(params.HTTPRequest).
		WithPassword(data.PasswordPtrToString(params.Body.Password)).
		WithSignup(params.HTTPRequest, "", !config.ServerConfig.LogFullIPs)

	// If it's the first registered LOCAL user, make them a superuser
	if cnt, err := svc.Services.UserService(nil /* TODO */).CountUsers(true, true, false, true, false); err != nil {
		return respServiceError(err)
	} else if cnt == 0 {
		user.WithConfirmed(true).IsSuperuser = true
		logger.Infof("User %s (%s) is made a superuser", &user.ID, user.Email)

		// If no operational mailer is configured, or confirmation is switched off in the config, mark the user
		// confirmed right away
	} else if !util.TheMailer.Operational() ||
		!svc.Services.DynConfigService().GetBool(data.ConfigKeyAuthSignupConfirmUser) {
		user.WithConfirmed(true)
	}

	// Sign-up the new user
	if r := signupUser(user); r != nil {
		return r
	}

	// Fetch the user's attributes
	attr, err := svc.Services.UserAttrService(nil /* TODO */).GetAll(&user.ID)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewAuthSignupOK().WithPayload(user.ToPrincipal(attr, nil))
}

// authCreateLoginToken creates and returns a new token with the "login" scope. If ownerID == nil, an anonymous token is
// returned
func authCreateLoginToken(ownerID *uuid.UUID) (*data.Token, error) {
	// Create a new, anonymous token
	if t, err := data.NewToken(ownerID, data.TokenScopeLogin, util.AuthSessionDuration, false); err != nil {
		return nil, err

		// Persist the token
	} else if err := svc.Services.TokenService(nil).Create(t); err != nil {
		return nil, err

	} else {
		// Succeeded
		return t, nil
	}
}

// authAddUserSessionToResponse returns a responder that sets a session cookie for the given session and user
func authAddUserSessionToResponse(resp PrincipalResponder, user *data.User, us *data.UserSession) middleware.Responder {
	// Fetch the user's attributes
	attr, err := svc.Services.UserAttrService(nil /* TODO */).GetAll(&user.ID)
	if err != nil {
		return respServiceError(err)
	}

	// Set the principal as the responder's payload
	resp.SetPayload(user.ToPrincipal(attr, nil))

	// Respond with the session cookie
	return NewCookieResponder(resp).
		WithCookie(
			util.CookieNameUserSession,
			us.EncodeIDs(),
			"/",
			util.UserSessionDuration,
			true,
			http.SameSiteLaxMode)
}

// loginLocalUser tries to log a local user in using their email and password, returning the user and a new user
// session. In case of error an error responder is returned
func loginLocalUser(email, password, host string, req *http.Request) (*data.User, *data.UserSession, middleware.Responder) {
	// Find the user
	user, err := svc.Services.UserService(nil /* TODO */).FindUserByEmail(email)
	if errors.Is(err, svc.ErrNotFound) || err == nil && !user.IsLocal() {
		util.RandomSleep(util.WrongAuthDelayMin, util.WrongAuthDelayMax)
		return nil, nil, respUnauthorized(exmodels.ErrorInvalidCredentials)
	} else if err != nil {
		return nil, nil, respServiceError(err)
	}

	// Verify the provided password
	if !user.VerifyPassword(password) {
		// Wrong password. Register the failed login attempt
		user.WithLastLogin(false)

		// Lock the user out if they exhausted the allowed attempts (and maxAttempts > 0)
		if i := svc.Services.DynConfigService().GetInt(data.ConfigKeyAuthLoginLocalMaxAttempts); i > 0 && user.FailedLoginAttempts > i {
			user.WithLocked(true)
		}

		// Persist ignoring possible errors
		_ = svc.Services.UserService(nil /* TODO */).UpdateLoginLocked(user)

		// Pause for a random while
		util.RandomSleep(util.WrongAuthDelayMin, util.WrongAuthDelayMax)
		return nil, nil, respUnauthorized(exmodels.ErrorInvalidCredentials)
	}

	// Verify the user can log in and create a new session
	if us, r := loginUser(user, host, req); r != nil {
		return nil, nil, r
	} else {
		// Succeeded
		return user, us, nil
	}
}

// loginUser verifies the user is allowed to authenticate, logs the given user in, and returns a new user session. In
// case of error an error responder is returned
func loginUser(user *data.User, host string, req *http.Request) (*data.UserSession, middleware.Responder) {
	// Verify the user is allowed to log in
	if errm := svc.Services.AuthService(nil /* TODO */).UserCanAuthenticate(user, true); errm != nil {
		return nil, respUnauthorized(errm)
	}

	// Create a new session
	us := data.NewUserSession(&user.ID, host, req, !config.ServerConfig.LogFullIPs)
	if err := svc.Services.UserService(nil /* TODO */).CreateUserSession(us); err != nil {
		return nil, respServiceError(err)
	}

	// Update the user's last login timestamp
	if err := svc.Services.UserService(nil /* TODO */).UpdateLoginLocked(user.WithLastLogin(true)); err != nil {
		return nil, respServiceError(err)
	}

	// If Gravatar is enabled, try to fetch the user's avatar, in the background
	if svc.Services.DynConfigService().GetBool(data.ConfigKeyIntegrationsUseGravatar) {
		// We intentionally run this in a non-transactional context, since it's a background operation
		svc.Services.AvatarService(nil).SetFromGravatarAsync(&user.ID, user.Email, false)
	}

	// Succeeded
	return us, nil
}

// signupUser saves the given user and runs post-signup tasks
func signupUser(user *data.User) middleware.Responder {
	// Save the new user
	if err := svc.Services.UserService(nil /* TODO */).Create(user); err != nil {
		return respServiceError(err)
	}

	// Send a confirmation email if needed
	if r := sendConfirmationEmail(user); r != nil {
		return r
	}

	// If Gravatar is enabled, try to fetch the user's avatar, ignoring any error. Do that synchronously to let the user
	// see their avatar right away
	if svc.Services.DynConfigService().GetBool(data.ConfigKeyIntegrationsUseGravatar) {
		// We intentionally run this in a non-transactional context, since it's a background operation
		svc.Services.AvatarService(nil).SetFromGravatarAsync(&user.ID, user.Email, false)
	}

	// Succeeded
	return nil
}
