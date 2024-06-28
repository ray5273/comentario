package auth

import (
	"encoding/base64"
	"errors"
	"fmt"
	oaerrors "github.com/go-openapi/errors"
	"github.com/google/uuid"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"net/http"
)

var (
	ErrSessionHeaderMissing = errors.New("session auth header missing in request")

	ErrUnauthorised  = oaerrors.New(http.StatusUnauthorized, http.StatusText(http.StatusUnauthorized))
	ErrInternalError = oaerrors.New(http.StatusInternalServerError, http.StatusText(http.StatusInternalServerError))
)

// logger represents a package-wide logger instance
var logger = logging.MustGetLogger("auth")

// AuthenticateBearerToken inspects the token (usually provided in a header) and determines if the token is of one of
// the provided scopes
func AuthenticateBearerToken(tokenStr string, scopes []string) (*data.User, error) {
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
	} else if err := UserCanAuthenticate(user, false); err != nil {
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

// AuthenticateUserByCookieHeader tries to fetch the user owning the session contained in the Cookie header
func AuthenticateUserByCookieHeader(headerValue string) (*data.User, error) {
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

// AuthenticateUserBySessionHeader tries to fetch the user owning the session contained in the X-User-Session header
func AuthenticateUserBySessionHeader(headerValue string) (*data.User, error) {
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
	} else if errm := UserCanAuthenticate(user, true); errm != nil {
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
	if errm := UserCanAuthenticate(user, true); errm != nil {
		return nil, errm.Error()
	}

	// Succeeded
	return user, nil
}

// GetUserSessionBySessionHeader parses the session header contained in the given request and returns the corresponding user
func GetUserSessionBySessionHeader(r *http.Request) (*data.User, *data.UserSession, error) {
	return FetchUserBySessionHeader(r.Header.Get(util.HeaderUserSession))
}

// UserCanAuthenticate checks if the provided user is allowed to authenticate with the backend. requireConfirmed
// indicates if the user must also have a confirmed email
func UserCanAuthenticate(user *data.User, requireConfirmed bool) *exmodels.Error {
	switch {
	// Only non-system, non-anonymous users may login
	case user.SystemAccount || user.IsAnonymous():
		return exmodels.ErrorInvalidCredentials

	// Check if the user is locked out
	case user.IsLocked:
		return exmodels.ErrorUserLocked

	// Check if the user is banned
	case user.Banned:
		return exmodels.ErrorUserBanned

	// If required, check if the user has confirmed their email
	case requireConfirmed && !user.Confirmed:
		return exmodels.ErrorEmailNotConfirmed
	}

	// Succeeded
	return nil
}
