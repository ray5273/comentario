package handlers

import (
	"encoding/base64"
	"errors"
	"fmt"
	oaerrors "github.com/go-openapi/errors"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"net/http"
	"strings"
)

var (
	ErrUnauthorised  = oaerrors.New(http.StatusUnauthorized, http.StatusText(http.StatusUnauthorized))
	ErrInternalError = oaerrors.New(http.StatusInternalServerError, http.StatusText(http.StatusInternalServerError))
)

// AuthBearerToken inspects the header and determines if the token is of one of the provided scopes
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
		loc = config.URLForUI(user.LangID, "auth/login", map[string]string{"confirmed": "true"})
	}

	// Redirect the user's browser
	return api_general.NewAuthConfirmTemporaryRedirect().WithLocation(loc)
}

func AuthDeleteProfile(_ api_general.AuthDeleteProfileParams, user *data.User) middleware.Responder {
	// If the current user is a superuser, make sure there are others
	if user.IsSuperuser {
		if cnt, err := svc.TheUserService.CountUsers(true, false, false, true, true); err != nil {
			return respServiceError(err)
		} else if cnt <= 1 {
			return respBadRequest(ErrorDeletingLastSuperuser)
		}
	}

	// If the user owns domains, make sure there are other owners in each of them
	if ds, dus, err := svc.TheDomainService.ListByDomainUser(&user.ID, &user.ID, false, true, "", "", data.SortAsc, -1); err != nil {
		respServiceError(err)
	} else {
		// Figure out which domains the user owns
		ownedDomains := make(map[uuid.UUID]bool)
		for _, du := range dus {
			if du.IsOwner && du.UserID == user.ID {
				ownedDomains[du.DomainID] = true
			}
		}

		// Count domain owners by domain ID
		ownerCounts := make(map[uuid.UUID]int)
		for _, du := range dus {
			// Only take domains the user owns into account
			if du.IsOwner && ownedDomains[du.DomainID] {
				ownerCounts[du.DomainID]++
			}
		}

		// Now figure out which domains have no other owners
		var toBeOrphaned []string
		for _, d := range ds {
			if cnt, ok := ownerCounts[d.ID]; ok && cnt <= 1 {
				toBeOrphaned = append(toBeOrphaned, d.Host)
			}
		}

		// Verify none are to be orphaned
		if len(toBeOrphaned) > 0 {
			return respBadRequest(ErrorDeletingLastOwner.WithDetails(strings.Join(toBeOrphaned, ", ")))
		}
	}

	// Delete the user
	if err := svc.TheUserService.DeleteUserByID(&user.ID); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewAuthDeleteProfileNoContent()
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
	return NewCookieResponder(
		api_general.NewAuthLoginOK().WithPayload(user.ToPrincipal(nil))).
		WithCookie(
			util.CookieNameUserSession,
			us.EncodeIDs(),
			"/",
			util.UserSessionDuration,
			true,
			http.SameSiteLaxMode)
}

func AuthLoginTokenNew(_ api_general.AuthLoginTokenNewParams) middleware.Responder {
	// Create a new, anonymous token
	if t, err := data.NewToken(nil, data.TokenScopeLogin, util.AuthSessionDuration, false); err != nil {
		return respInternalError(nil)

		// Persist the token
	} else if err := svc.TheTokenService.Create(t); err != nil {
		return respServiceError(err)

	} else {
		// Succeeded
		return api_general.NewAuthLoginTokenNewOK().WithPayload(&api_general.AuthLoginTokenNewOKBody{Token: t.String()})
	}
}

func AuthLoginTokenRedeem(params api_general.AuthLoginTokenRedeemParams, user *data.User) middleware.Responder {
	// Verify the user can log in and create a new session
	us, r := loginUser(user, "", params.HTTPRequest)
	if r != nil {
		return r
	}

	// Succeeded. Return a principal and a session cookie
	return NewCookieResponder(
		api_general.NewAuthLoginOK().WithPayload(user.ToPrincipal(nil))).
		WithCookie(
			util.CookieNameUserSession,
			us.EncodeIDs(),
			"/",
			util.UserSessionDuration,
			true,
			http.SameSiteLaxMode)
}

// AuthLogout logs currently logged user out
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
	if err := svc.TheUserService.Update(user.WithPassword(swag.StringValue(params.Body.Password))); err != nil {
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

		// User found. Generate a random password-reset token
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
	if !config.CLIFlags.AllowSignups {
		return respForbidden(ErrorSignupsForbidden)
	}

	// Verify no such email is registered yet
	email := data.EmailPtrToString(params.Body.Email)
	if r := Verifier.UserCanSignupWithEmail(email); r != nil {
		return r
	}

	// Create a new user
	user := data.NewUser(email, data.TrimmedString(params.Body.Name)).
		WithPassword(swag.StringValue(params.Body.Password)).
		WithSignup(params.HTTPRequest, "")

	// If it's the first registered LOCAL user, make them a superuser
	if cnt, err := svc.TheUserService.CountUsers(true, true, false, true, false); err != nil {
		return respServiceError(err)
	} else if cnt == 0 {
		user.WithConfirmed(true).IsSuperuser = true

		// If SMTP isn't configured, mark the user confirmed right away
	} else if !config.SMTPConfigured {
		user.WithConfirmed(true)

		// If confirmation is switched off in the config, mark the user confirmed, too
	} else if ci, err := svc.TheConfigService.Get(data.ConfigKeyAuthSignupConfirmUser); err != nil {
		respServiceError(err)
	} else if !ci.AsBool() {
		user.WithConfirmed(true)
	}

	// Save the new user
	if err := svc.TheUserService.Create(user); err != nil {
		return respServiceError(err)
	}

	// Send a confirmation email if needed
	if r := sendConfirmationEmail(user); r != nil {
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
	user, err := svc.TheUserService.FindUserByEmail(email, true)
	if errors.Is(err, svc.ErrNotFound) {
		util.RandomSleep(util.WrongAuthDelayMin, util.WrongAuthDelayMax)
		return nil, nil, respUnauthorized(ErrorInvalidCredentials)
	} else if err != nil {
		return nil, nil, respServiceError(err)
	}

	// Verify the provided password
	if !user.VerifyPassword(password) {
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

	// Succeeded
	return us, nil
}
