package handlers

import (
	"encoding/base64"
	"errors"
	"fmt"
	oaerrors "github.com/go-openapi/errors"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"net/http"
	"strings"
)

var (
	ErrSessionHeaderMissing = errors.New("session auth header missing in request")

	ErrUnauthorised  = oaerrors.New(http.StatusUnauthorized, http.StatusText(http.StatusUnauthorized))
	ErrInternalError = oaerrors.New(http.StatusInternalServerError, http.StatusText(http.StatusInternalServerError))
)

// PrincipalResponder is an interface for a responder with the SetPayload method for returning a principal
type PrincipalResponder interface {
	middleware.Responder
	SetPayload(*models.Principal)
}

// AuthBearerToken inspects the token (usually provided in a header) and determines if the token is of one of the
// provided scopes
func AuthBearerToken(tokenStr string, scopes []string) (*data.User, error) {
	// Try to find the token
	token, err := svc.TheTokenService.FindByStrValue(tokenStr, false)
	if err != nil {
		return nil, ErrUnauthorised
	}

	// Check if the token is of the right scope
	if util.IndexOfString(string(token.Scope), scopes) < 0 {
		return nil, ErrUnauthorised
	}

	// Token seems legitimate, now find its owner
	var user *data.User
	if user, err = svc.TheUserService.FindUserByID(&token.Owner); err != nil {
		return nil, ErrInternalError

		// Verify the user is allowed to authenticate at all
	} else if err, _ := Verifier.UserCanAuthenticate(user, false); err != nil {
		// Not allowed
		return nil, ErrUnauthorised
	}

	// If it's a disposable token, revoke it, ignoring any error
	if !token.Multiuse {
		_ = svc.TheTokenService.DeleteByValue(token.Value)
	}

	// Succeeded
	return user, nil
}

func AuthConfirm(_ api_general.AuthConfirmParams, user *data.User) middleware.Responder {
	// Don't bother if the user is already confirmed
	if !user.Confirmed {
		// Update the user
		if err := svc.TheUserService.ConfirmUser(&user.ID); err != nil {
			return respServiceError(err)
		}
	}

	// Determine the redirect location: if there's a signup URL, use it
	loc := user.SignupHost
	if loc == "" {
		// Redirect to the UI login page otherwise
		loc = svc.TheI18nService.FrontendURL(user.LangID, "auth/login", map[string]string{"confirmed": "true"})
	}

	// Redirect the user's browser
	return api_general.NewAuthConfirmTemporaryRedirect().WithLocation(loc)
}

func AuthDeleteProfile(params api_general.AuthDeleteProfileParams, user *data.User) middleware.Responder {
	// If the current user is a superuser, make sure there are others
	if user.IsSuperuser {
		if cnt, err := svc.TheUserService.CountUsers(true, false, false, true, true); err != nil {
			return respServiceError(err)
		} else if cnt <= 1 {
			return respBadRequest(ErrorDeletingLastSuperuser)
		}
	}

	// Figure out which domains the user owns
	var ownedDomains []*data.Domain
	if ds, dus, err := svc.TheDomainService.ListByDomainUser(&user.ID, &user.ID, false, true, "", "", data.SortAsc, -1); err != nil {
		respServiceError(err)
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
			_, dus, err := svc.TheUserService.ListByDomain(&d.ID, false, "", "", data.SortAsc, -1)
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
		return respBadRequest(ErrorDeletingLastOwner.WithDetails(strings.Join(toBeOrphaned, ", ")))
	}

	// Delete the user, optionally deleting their comments
	if cntDel, err := svc.TheUserService.DeleteUserByID(&user.ID, params.Body.DeleteComments, params.Body.PurgeComments); err != nil {
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
	return api_general.NewAuthLoginTokenNewOK().WithPayload(&api_general.AuthLoginTokenNewOKBody{Token: t.String()})
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
	_, sessionID, err := FetchUserSessionIDFromCookie(params.HTTPRequest)
	if err != nil {
		return respUnauthorized(nil)
	}

	// Delete the session token, ignoring any error
	_ = svc.TheUserService.DeleteUserSession(sessionID)

	// Regardless of whether the above was successful, return a success response, removing the session cookie
	return NewCookieResponder(api_general.NewAuthLogoutNoContent()).WithoutCookie(util.CookieNameUserSession, "/")
}

func AuthPwdResetChange(params api_general.AuthPwdResetChangeParams, user *data.User) middleware.Responder {
	// Verify it's a local user
	if r := Verifier.UserIsLocal(user); r != nil {
		return r
	}

	// Update the user's password
	if err := svc.TheUserService.Update(user.WithPassword(data.PasswordPtrToString(params.Body.Password))); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewAuthPwdResetChangeNoContent()
}

func AuthPwdResetSendEmail(params api_general.AuthPwdResetSendEmailParams) middleware.Responder {
	// Find the local user with that email
	if user, err := svc.TheUserService.FindUserByEmail(data.EmailPtrToString(params.Body.Email), true); errors.Is(err, svc.ErrNotFound) {
		// No such email: apply a random delay to discourage email polling
		util.RandomSleep(util.WrongAuthDelayMin, util.WrongAuthDelayMax)

	} else if err != nil {
		// Any other error
		return respServiceError(err)

		// User found. Check if the account is locked
	} else if user.IsLocked {
		return respForbidden(ErrorUserLocked)

		// Generate a random password-reset token
	} else if token, err := data.NewToken(&user.ID, data.TokenScopeResetPassword, util.UserPwdResetDuration, false); err != nil {
		return respServiceError(err)

		// Persist the token
	} else if err := svc.TheTokenService.Create(token); err != nil {
		return respServiceError(err)

		// Send out an email
	} else if err := svc.TheMailService.SendPasswordReset(user, token); err != nil {
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
	if r := Verifier.UserCanSignupWithEmail(email); r != nil {
		return r
	}

	// Create a new user
	user := data.NewUser(email, data.TrimmedString(params.Body.Name)).
		WithPassword(data.PasswordPtrToString(params.Body.Password)).
		WithSignup(params.HTTPRequest, "")

	// If it's the first registered LOCAL user, make them a superuser
	if cnt, err := svc.TheUserService.CountUsers(true, true, false, true, false); err != nil {
		return respServiceError(err)
	} else if cnt == 0 {
		user.WithConfirmed(true).IsSuperuser = true
		logger.Infof("User %s (%s) is made a superuser", &user.ID, user.Email)

		// If no operational mailer is configured, or confirmation is switched off in the config, mark the user
		// confirmed right away
	} else if !util.TheMailer.Operational() ||
		!svc.TheDynConfigService.GetBool(data.ConfigKeyAuthSignupConfirmUser) {
		user.WithConfirmed(true)
	}

	// Sign-up the new user
	if r := signupUser(user); r != nil {
		return r
	}

	// Succeeded
	return api_general.NewAuthSignupOK().
		WithPayload(user.ToPrincipal(nil))
}

// AuthUserByCookieHeader tries to fetch the user owning the session contained in the Cookie header
func AuthUserByCookieHeader(headerValue string) (*data.User, error) {
	// Hack to parse the provided data (which is in fact the "Cookie" header, but Swagger 2.0 doesn't support
	// auth cookies, only headers)
	r := &http.Request{Header: http.Header{"Cookie": []string{headerValue}}}

	// Authenticate the user
	u, err := GetUserBySessionCookie(r)
	if err != nil {
		// Authentication failed
		logger.Warningf("Failed to authenticate user: %v", err)
		return nil, ErrUnauthorised
	}

	// Succeeded
	return u, nil
}

// AuthUserBySessionHeader tries to fetch the user owning the session contained in the X-User-Session header
func AuthUserBySessionHeader(headerValue string) (*data.User, error) {
	if user, _, err := FetchUserBySessionHeader(headerValue); err != nil {
		// Authentication failed
		return nil, ErrUnauthorised
	} else {
		// Succeeded
		return user, nil
	}
}

// ExtractUserSessionIDs parses and return the given string value that combines user and session ID
func ExtractUserSessionIDs(s string) (*uuid.UUID, *uuid.UUID, error) {
	// Decode the value from base64
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return nil, nil, err
	}

	// Check it's exactly 32 (16 + 16) bytes long
	if l := len(b); l != 32 {
		return nil, nil, fmt.Errorf("invalid user-session value length (%d), want 32", l)
	}

	// Extract ID and token
	if userID, err := uuid.FromBytes(b[:16]); err != nil {
		return nil, nil, err
	} else if sessionID, err := uuid.FromBytes(b[16:]); err != nil {
		return nil, nil, err
	} else {
		// Succeeded
		return &userID, &sessionID, nil
	}
}

// FetchUserBySessionHeader tries to fetch the user and their session by the session token contained in the
// X-User-Session header. Returns ErrSessionHeaderMissing if there's no headerValue passed
func FetchUserBySessionHeader(headerValue string) (*data.User, *data.UserSession, error) {
	// Make sure there's a value to parse
	if headerValue == "" {
		return nil, nil, ErrSessionHeaderMissing
	}

	// Extract session from the header value
	if userID, sessionID, err := ExtractUserSessionIDs(headerValue); err != nil {
		return nil, nil, err

		// Find the user and the session
	} else if user, us, err := svc.TheUserService.FindUserBySession(userID, sessionID); err != nil {
		return nil, nil, err

		// Verify the user is allowed to authenticate
	} else if errm, _ := Verifier.UserCanAuthenticate(user, true); errm != nil {
		return nil, nil, errm.Error()

	} else {
		// Succeeded
		return user, us, nil
	}
}

// FetchUserSessionIDFromCookie extracts user ID and session ID from a session cookie contained in the given request
func FetchUserSessionIDFromCookie(r *http.Request) (*uuid.UUID, *uuid.UUID, error) {
	// Extract user-session data from the cookie
	cookie, err := r.Cookie(util.CookieNameUserSession)
	if err != nil {
		return nil, nil, err
	}

	// Decode and parse the value
	return ExtractUserSessionIDs(cookie.Value)
}

// GetUserBySessionCookie parses the session cookie contained in the given request and returns the corresponding user
func GetUserBySessionCookie(r *http.Request) (*data.User, error) {
	// Extract session from the cookie
	userID, sessionID, err := FetchUserSessionIDFromCookie(r)
	if err != nil {
		return nil, err
	}

	// Find the user
	user, _, err := svc.TheUserService.FindUserBySession(userID, sessionID)
	if err != nil {
		return nil, err
	}

	// Verify the user is allowed to authenticate
	if errm, _ := Verifier.UserCanAuthenticate(user, true); errm != nil {
		return nil, errm.Error()
	}

	// Succeeded
	return user, nil
}

// GetUserSessionBySessionHeader parses the session header contained in the given request and returns the corresponding user
func GetUserSessionBySessionHeader(r *http.Request) (*data.User, *data.UserSession, error) {
	return FetchUserBySessionHeader(r.Header.Get(util.HeaderUserSession))
}

// authCreateLoginToken creates and returns a new token with the "login" scope. If ownerID == nil, an anonymous token is
// returned
func authCreateLoginToken(ownerID *uuid.UUID) (*data.Token, error) {
	// Create a new, anonymous token
	if t, err := data.NewToken(ownerID, data.TokenScopeLogin, util.AuthSessionDuration, false); err != nil {
		return nil, err

		// Persist the token
	} else if err := svc.TheTokenService.Create(t); err != nil {
		return nil, err

	} else {
		// Succeeded
		return t, nil
	}
}

// authAddUserSessionToResponse returns a responder that sets a session cookie for the given session and user
func authAddUserSessionToResponse(resp PrincipalResponder, user *data.User, us *data.UserSession) middleware.Responder {
	// Set the principal as the responder's payload
	resp.SetPayload(user.ToPrincipal(nil))

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
	user, err := svc.TheUserService.FindUserByEmail(email, true)
	if errors.Is(err, svc.ErrNotFound) {
		util.RandomSleep(util.WrongAuthDelayMin, util.WrongAuthDelayMax)
		return nil, nil, respUnauthorized(ErrorInvalidCredentials)
	} else if err != nil {
		return nil, nil, respServiceError(err)
	}

	// Verify the provided password
	if !user.VerifyPassword(password) {
		// Wrong password. Register the failed login attempt
		user.WithLastLogin(false)

		// Lock the user out if they exhausted the allowed attempts (and maxAttempts > 0)
		if i := svc.TheDynConfigService.GetInt(data.ConfigKeyAuthLoginLocalMaxAttempts); i > 0 && user.FailedLoginAttempts > i {
			user.WithLocked(true)
		}

		// Persist ignoring possible errors
		_ = svc.TheUserService.UpdateLoginLocked(user)

		// Pause for a random while
		util.RandomSleep(util.WrongAuthDelayMin, util.WrongAuthDelayMax)
		return nil, nil, respUnauthorized(ErrorInvalidCredentials)
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
	if _, r := Verifier.UserCanAuthenticate(user, true); r != nil {
		return nil, r
	}

	// Create a new session
	us := data.NewUserSession(&user.ID, host, req)
	if err := svc.TheUserService.CreateUserSession(us); err != nil {
		return nil, respServiceError(err)
	}

	// Update the user's last login timestamp
	if err := svc.TheUserService.UpdateLoginLocked(user.WithLastLogin(true)); err != nil {
		return nil, respServiceError(err)
	}

	// If Gravatar is enabled, try to fetch the user's avatar, in the background
	if svc.TheDynConfigService.GetBool(data.ConfigKeyIntegrationsUseGravatar) {
		svc.TheAvatarService.SetFromGravatarAsync(&user.ID, user.Email, false)
	}

	// Succeeded
	return us, nil
}

// signupUser saves the given user and runs post-signup tasks
func signupUser(user *data.User) middleware.Responder {
	// Save the new user
	if err := svc.TheUserService.Create(user); err != nil {
		return respServiceError(err)
	}

	// Send a confirmation email if needed
	if r := sendConfirmationEmail(user); r != nil {
		return r
	}

	// If Gravatar is enabled, try to fetch the user's avatar, ignoring any error. Do that synchronously to let the user
	// see their avatar right away
	if svc.TheDynConfigService.GetBool(data.ConfigKeyIntegrationsUseGravatar) {
		svc.TheAvatarService.SetFromGravatarAsync(&user.ID, user.Email, false)
	}

	// Succeeded
	return nil
}
