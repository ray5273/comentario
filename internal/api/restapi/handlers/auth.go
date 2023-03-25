package handlers

import (
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"github.com/go-openapi/errors"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_auth"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"golang.org/x/crypto/bcrypt"
	"net/http"
	"time"
)

var (
	ErrUnauthorised = errors.New(http.StatusUnauthorized, http.StatusText(http.StatusUnauthorized))
)

func AuthConfirm(params api_auth.AuthConfirmParams) middleware.Responder {
	// Update the owner, if the token checks out
	conf := "true"
	if err := svc.TheUserService.ConfirmOwner(models.HexID(params.Token)); err != nil {
		conf = "false"
	}

	// Redirect to login
	return api_auth.NewAuthConfirmTemporaryRedirect().
		WithLocation(config.URLFor("login", map[string]string{"confirmed": conf}))
}

func AuthDeleteProfile(_ api_auth.AuthDeleteProfileParams, principal data.Principal) middleware.Responder {
	// Fetch a list of domains
	if domains, err := svc.TheDomainService.ListByOwner(principal.GetHexID()); err != nil {
		return respServiceError(err)

		// Make sure the owner owns no domains
	} else if len(domains) > 0 {
		return respBadRequest(util.ErrorCannotDeleteOwner)
	}

	// Delete the user
	if err := svc.TheUserService.DeleteOwnerByID(principal.GetHexID()); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_auth.NewAuthDeleteProfileNoContent()
}

// AuthCommenterByTokenHeader determines if the commenter token, contained in the X-Commenter-Token header, checks out
func AuthCommenterByTokenHeader(headerValue string) (data.Principal, error) {
	// Validate the token format
	if token := models.HexID(headerValue); token.Validate(nil) == nil {
		// If it's an anonymous commenter
		if token == data.AnonymousCommenter.HexID {
			return &data.AnonymousCommenter, nil
		}

		// Try to find the commenter by that token
		if commenter, err := svc.TheUserService.FindCommenterByToken(token); err == nil {
			return commenter, nil
		}
	}

	// Authentication failed
	return nil, ErrUnauthorised
}

// AuthLogin logs a user in using local authentication (email and password)
func AuthLogin(params api_auth.AuthLoginParams) middleware.Responder {
	// Find the user
	user, err := svc.TheUserService.FindOwnerByEmail(data.EmailToString(params.Body.Email), true)
	if err == svc.ErrNotFound {
		time.Sleep(util.WrongAuthDelay)
		return respUnauthorized(util.ErrorInvalidEmailPassword)
	} else if err != nil {
		return respServiceError(err)
	}

	// Verify the owner is confirmed
	if !user.EmailConfirmed {
		return respUnauthorized(util.ErrorUnconfirmedEmail)
	}

	// Verify the provided password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(swag.StringValue(params.Body.Password))); err != nil {
		time.Sleep(util.WrongAuthDelay)
		return respUnauthorized(util.ErrorInvalidEmailPassword)
	}

	// Create a new owner session
	ownerToken, err := svc.TheUserService.CreateOwnerSession(user.HexID)
	if err != nil {
		return respServiceError(err)
	}

	// Make a value for the session cookie
	sv, err := GetSessionValue(user.HexID, ownerToken)
	if err != nil {
		return respInternalError()
	}

	// Succeeded. Return a principal and a session cookie
	return NewCookieResponder(api_auth.NewAuthLoginOK().WithPayload(user.ToAPIModel())).
		WithCookie(
			util.CookieNameUserSession,
			sv,
			"/",
			util.UserSessionCookieDuration,
			true,
			http.SameSiteLaxMode)
}

// AuthLogout logs currently logged user out
func AuthLogout(params api_auth.AuthLogoutParams, _ data.Principal) middleware.Responder {
	// Extract session from the cookie
	userID, token, err := FetchUserSessionFromCookie(params.HTTPRequest)
	if err != nil {
		return respUnauthorized(err)
	}

	// Delete the session token, ignoring any error
	_ = svc.TheUserService.DeleteOwnerSession(userID, token)

	// Regardless of whether the above was successful, return a success response, removing the session cookie
	return NewCookieResponder(api_auth.NewAuthLogoutNoContent()).WithoutCookie(util.CookieNameUserSession, "/")
}

func AuthSignup(params api_auth.AuthSignupParams) middleware.Responder {
	// Verify new owners are allowed
	if !config.CLIFlags.AllowNewOwners {
		return respForbidden(util.ErrorNewOwnerForbidden)
	}

	// Verify no owner with that email exists yet
	email := data.EmailToString(params.Body.Email)
	if r := Verifier.OwnerEmaiUnique(email); r != nil {
		return r
	}

	// Create a new email record
	if _, err := svc.TheEmailService.Create(email); err != nil {
		return respServiceError(err)
	}

	// Create a new owner record
	name := data.TrimmedString(params.Body.Name)
	pwd := swag.StringValue(params.Body.Password)
	owner, err := svc.TheUserService.CreateOwner(email, name, pwd)
	if err != nil {
		return respServiceError(err)
	}

	// If mailing is configured, create and mail a confirmation token
	if config.SMTPConfigured {
		// Create a new confirmation token
		token, err := svc.TheUserService.CreateOwnerConfirmationToken(owner.HexID)
		if err != nil {
			return respServiceError(err)
		}

		// Send a confirmation email
		err = svc.TheMailService.SendFromTemplate(
			"",
			email,
			"Please confirm your email address",
			"confirm-hex.gohtml",
			map[string]any{"URL": config.URLForAPI("owner/confirm-hex", map[string]string{"confirmHex": string(token)})})
		if err != nil {
			return respServiceError(err)
		}
	}

	// If no commenter with that email exists yet, register the owner also as a commenter, with the same password
	if _, err := svc.TheUserService.FindCommenterByIdPEmail("", email, false); err == svc.ErrNotFound {
		if _, err := svc.TheUserService.CreateCommenter(email, name, "", "", "", pwd); err != nil {
			return respServiceError(err)
		}
	}

	// Succeeded
	return api_auth.NewAuthSignupOK().WithPayload(&api_auth.AuthSignupOKBody{ConfirmEmail: config.SMTPConfigured})
}

// AuthUserByCookieHeader determines if the owner token contained in the cookie, extracted from the passed Cookie
// header, checks out
func AuthUserByCookieHeader(headerValue string) (data.Principal, error) {
	// Hack to parse the provided data (which is in fact the "Cookie" header, but Swagger 2.0 doesn't support
	// auth cookies, only headers)
	r := &http.Request{Header: http.Header{"Cookie": []string{headerValue}}}

	// Authenticate the user
	u, err := GetUserFromSessionCookie(r)
	if err != nil {
		// Authentication failed
		logger.Warningf("Failed to authenticate user: %v", err)
		return nil, ErrUnauthorised
	}

	// Succeeded
	return u, nil
}

// FetchUserSessionFromCookie parses the session cookie contained in the given request, validates it and returns the
// user ID and the session token
func FetchUserSessionFromCookie(r *http.Request) (models.HexID, models.HexID, error) {
	// Extract session data from the cookie
	cookie, err := r.Cookie(util.CookieNameUserSession)
	if err != nil {
		return "", "", err
	}

	// Decode the cookie
	b, err := base64.RawURLEncoding.DecodeString(cookie.Value)
	if err != nil {
		return "", "", err
	}

	// Check it's exactly 64 (32 + 32) bytes long
	if l := len(b); l != 64 {
		return "", "", fmt.Errorf("invalid cookie value length (%d), want 64", l)
	}

	// Extract ID and token, decoding them into a string hex ID
	userID := models.HexID(hex.EncodeToString(b[:32]))
	token := models.HexID(hex.EncodeToString(b[32:]))

	// Validate the data
	if err = userID.Validate(nil); err != nil {
		return "", "", err
	}
	if err = token.Validate(nil); err != nil {
		return "", "", err
	}

	// Succeeded
	return userID, token, nil
}

// GetSessionValue creates a value for the session cookie from a user ID and a token
func GetSessionValue(id, token models.HexID) (string, error) {
	// Decode the values into a binary
	if bid, err := data.DecodeHexID(id); err != nil {
		logger.Errorf("GetSessionValue: DecodeHex() failed for id: %v", err)
		return "", err
	} else if bt, err := data.DecodeHexID(token); err != nil {
		logger.Errorf("GetSessionValue: DecodeHex() failed for token: %v", err)
		return "", err
	} else {
		return base64.RawURLEncoding.EncodeToString(append(bid[:], bt[:]...)), nil
	}
}

// GetUserFromSessionCookie parses the session cookie contained in the given request and returns the corresponding user
func GetUserFromSessionCookie(r *http.Request) (*data.UserOwner, error) {
	// Extract session from the cookie
	userID, token, err := FetchUserSessionFromCookie(r)
	if err != nil {
		return nil, err
	}

	// Find the user
	user, err := svc.TheUserService.FindOwnerByToken(token)
	if err != nil {
		return nil, err
	}

	// Verify the token belongs to the user
	if user.HexID != userID {
		return nil, fmt.Errorf("session doesn't belong to the user")
	}

	return user, nil
}
