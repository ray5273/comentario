package handlers

import (
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"github.com/go-openapi/errors"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_auth"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"net/http"
)

var (
	ErrUnauthorised  = errors.New(http.StatusUnauthorized, http.StatusText(http.StatusUnauthorized))
	ErrInternalError = errors.New(http.StatusInternalServerError, http.StatusText(http.StatusInternalServerError))
)

// AuthBearerToken inspects the header and determines if the token is of one of the provided scopes
func AuthBearerToken(tokenStr string, scopes []string) (*data.User, error) {
	// Try to parse and find the token
	var token *data.Token
	if val, err := hex.DecodeString(tokenStr); err != nil || len(val) != 32 {
		return nil, ErrUnauthorised
	} else if token, err = svc.TheTokenService.FindByValue(val, false); err != nil {
		return nil, ErrUnauthorised
	}

	// Check if the token is of the right scope
	if util.IndexOfString(string(token.Scope), scopes) < 0 {
		return nil, ErrUnauthorised
	}

	// Token seems legitimate, now find its owner
	var user *data.User
	var err error
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

func AuthConfirm(_ api_auth.AuthConfirmParams, user *data.User) middleware.Responder {
	// Don't bother if the user is already confirmed
	if !user.Confirmed {
		// Update the user
		if err := svc.TheUserService.ConfirmUser(&user.ID); err != nil {
			return respServiceError(err)
		}
	}

	// Determine the redirect location: if there's a signup URL, use it
	loc := user.SignupURL
	if loc == "" {
		// Redirect to the UI login page otherwise
		loc = config.URLFor("login", map[string]string{"confirmed": "true"})
	}

	// Redirect the user's browser
	return api_auth.NewAuthConfirmTemporaryRedirect().WithLocation(loc)
}

func AuthDeleteProfile(_ api_auth.AuthDeleteProfileParams, user *data.User) middleware.Responder {
	// Fetch a list of domains
	if domains, err := svc.TheDomainService.ListByOwnerID(&user.ID); err != nil {
		return respServiceError(err)

		// Make sure the owner owns no domains
	} else if l := len(domains); l > 0 {
		return respBadRequest(ErrorOwnerHasDomains.WithDetails(fmt.Sprintf("%d domain(s)", l)))
	}

	// Delete the user
	if err := svc.TheUserService.DeleteUserByID(&user.ID); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_auth.NewAuthDeleteProfileNoContent()
}

// AuthLogin logs a user in using local authentication (email and password)
func AuthLogin(params api_auth.AuthLoginParams) middleware.Responder {
	// Log the user in
	user, session, r := loginLocalUser(
		data.EmailPtrToString(params.Body.Email),
		swag.StringValue(params.Body.Password),
		"",
		params.HTTPRequest)
	if r != nil {
		return r
	}

	// Succeeded. Return a principal and a session cookie
	return NewCookieResponder(api_auth.NewAuthLoginOK().WithPayload(user.ToPrincipal(nil))).
		WithCookie(
			util.CookieNameUserSession,
			session.EncodeIDs(),
			"/",
			util.UserSessionDuration,
			true,
			http.SameSiteLaxMode)
}

// AuthLogout logs currently logged user out
func AuthLogout(params api_auth.AuthLogoutParams, _ *data.User) middleware.Responder {
	// Extract session from the cookie
	_, sessionID, err := FetchUserSessionIDFromCookie(params.HTTPRequest)
	if err != nil {
		return respUnauthorized(nil)
	}

	// Delete the session token, ignoring any error
	_ = svc.TheUserService.DeleteUserSession(sessionID)

	// Regardless of whether the above was successful, return a success response, removing the session cookie
	return NewCookieResponder(api_auth.NewAuthLogoutNoContent()).WithoutCookie(util.CookieNameUserSession, "/")
}

func AuthPwdResetChange(params api_auth.AuthPwdResetChangeParams, user *data.User) middleware.Responder {
	// Verify it's a local user
	if r := Verifier.UserIsLocal(user); r != nil {
		return r
	}

	// Update the user's password
	if err := svc.TheUserService.UpdateLocalUser(user.WithPassword(swag.StringValue(params.Body.Password))); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_auth.NewAuthPwdResetChangeNoContent()
}

func AuthPwdResetSendEmail(params api_auth.AuthPwdResetSendEmailParams) middleware.Responder {
	if r := sendPasswordResetEmail(data.EmailPtrToString(params.Body.Email)); r != nil {
		return r
	}

	// Succeeded
	return api_auth.NewAuthPwdResetSendEmailNoContent()
}

func AuthSignup(params api_auth.AuthSignupParams) middleware.Responder {
	// Verify new owners are allowed
	if !config.CLIFlags.AllowNewOwners {
		return respForbidden(ErrorSignupsForbidden)
	}

	// Verify no such email is registered yet
	email := data.EmailPtrToString(params.Body.Email)
	if exists, err := svc.TheUserService.IsUserEmailKnown(email); err != nil {
		return respServiceError(err)
	} else if exists {
		return respBadRequest(ErrorEmailAlreadyExists)
	}

	// Create a new user
	user := data.NewUser(email, data.TrimmedString(params.Body.Name)).
		WithPassword(swag.StringValue(params.Body.Password)).
		WithSignup(params.HTTPRequest, "")

	// If it's the first registered user, make them a superuser
	if cnt, err := svc.TheUserService.CountUsers(false); err != nil {
		return respServiceError(err)
	} else if cnt == 0 {
		user.WithConfirmed(true).Superuser = true

	} else {
		// If SMTP isn't configured, mark the user confirmed right away
		user.WithConfirmed(!config.SMTPConfigured)
	}

	// Save the new user
	if err := svc.TheUserService.CreateUser(user); err != nil {
		return respServiceError(err)
	}

	// Send a confirmation email if needed
	if r := sendConfirmationEmail(user); r != nil {
		return r
	}

	// Succeeded
	return api_auth.NewAuthSignupOK().WithPayload(user.ToPrincipal(nil))
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
// X-User-Session header. If the user is anonymous, returns AnonymousUser and a nil for session
func FetchUserBySessionHeader(headerValue string) (*data.User, *data.UserSession, error) {
	// Extract session from the header value
	if userID, sessionID, err := ExtractUserSessionIDs(headerValue); err != nil {
		return nil, nil, err

		// If it's an anonymous user
	} else if *userID == data.AnonymousUser.ID {
		return data.AnonymousUser, nil, nil

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

// loginLocalUser tries to log a local user in using their email and password, returning the user and a new user
// session. In case of error an error responder is returned
func loginLocalUser(email, password, host string, req *http.Request) (*data.User, *data.UserSession, middleware.Responder) {
	// Find the user
	user, err := svc.TheUserService.FindLocalUserByEmail(email)
	if err == svc.ErrNotFound {
		util.RandomSleep(util.WrongAuthDelayMin, util.WrongAuthDelayMax)
		return nil, nil, respUnauthorized(ErrorInvalidCredentials)
	} else if err != nil {
		return nil, nil, respServiceError(err)
	}

	// Verify the user is allowed to log in
	if _, r := Verifier.UserCanAuthenticate(user, true); r != nil {
		return nil, nil, r
	}

	// Verify the provided password
	if !user.VerifyPassword(password) {
		util.RandomSleep(util.WrongAuthDelayMin, util.WrongAuthDelayMax)
		return nil, nil, respUnauthorized(ErrorInvalidCredentials)
	}

	// Create a new session
	session := data.NewUserSession(&user.ID, host, req)
	if err := svc.TheUserService.CreateUserSession(session); err != nil {
		return nil, nil, respServiceError(err)
	}

	// Succeeded
	return user, session, nil
}
