package handlers

import (
	"encoding/base64"
	"fmt"
	"github.com/go-openapi/errors"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_auth"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"net/http"
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

func AuthDeleteProfile(_ api_auth.AuthDeleteProfileParams, user *data.User) middleware.Responder {
	// Fetch a list of domains
	if domains, err := svc.TheDomainService.ListByOwner(principal.GetHexID()); err != nil {
		return respServiceError(err)

		// Make sure the owner owns no domains
	} else if l := len(domains); l > 0 {
		return respBadRequest(ErrorOwnerHasDomains.WithDetails(fmt.Sprintf("%d domain(s)", l)))
	}

	// Delete the user
	if err := svc.TheUserService.DeleteOwnerByID(principal.GetHexID()); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_auth.NewAuthDeleteProfileNoContent()
}

// AuthLogin logs a user in using local authentication (email and password)
func AuthLogin(params api_auth.AuthLoginParams) middleware.Responder {
	// Find the user
	user, err := svc.TheUserService.FindLocalUserByEmail(data.EmailToString(params.Body.Email))
	if err == svc.ErrNotFound {
		util.RandomSleep(util.WrongAuthDelayMin, util.WrongAuthDelayMax)
		return respUnauthorized(ErrorInvalidCredentials)
	} else if err != nil {
		return respServiceError(err)
	}

	// Verify the user is allowed to login
	if _, r := Verifier.UserCanAuthenticate(user, true); r != nil {
		return r
	}

	// Verify the provided password
	if !user.VerifyPassword(swag.StringValue(params.Body.Password)) {
		util.RandomSleep(util.WrongAuthDelayMin, util.WrongAuthDelayMax)
		return respUnauthorized(ErrorInvalidCredentials)
	}

	// Create a new owner session
	us := data.NewUserSession(&user.ID, "", params.HTTPRequest)
	if err := svc.TheUserService.CreateUserSession(us); err != nil {
		return respServiceError(err)
	}

	// Succeeded. Return a principal and a session cookie
	return NewCookieResponder(api_auth.NewAuthLoginOK().WithPayload(user.ToPrincipal())).
		WithCookie(
			util.CookieNameUserSession,
			us.EncodeIDs(),
			"/",
			util.UserSessionDuration,
			true,
			http.SameSiteLaxMode)
}

// AuthLogout logs currently logged user out
func AuthLogout(params api_auth.AuthLogoutParams, _ *data.User) middleware.Responder {
	// Extract session from the cookie
	_, sessionID, err := FetchUserSessionFromCookie(params.HTTPRequest)
	if err != nil {
		return respUnauthorized(nil)
	}

	// Delete the session token, ignoring any error
	_ = svc.TheUserService.DeleteUserSession(sessionID)

	// Regardless of whether the above was successful, return a success response, removing the session cookie
	return NewCookieResponder(api_auth.NewAuthLogoutNoContent()).WithoutCookie(util.CookieNameUserSession, "/")
}

func AuthSignup(params api_auth.AuthSignupParams) middleware.Responder {
	// Verify new owners are allowed
	if !config.CLIFlags.AllowNewOwners {
		return respForbidden(ErrorSignupsForbidden)
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

// AuthUserByCookieHeader determines if the user session contained in the cookie, extracted from the passed Cookie
// header, checks out
func AuthUserByCookieHeader(headerValue string) (*data.User, error) {
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

// AuthUserBySessionHeader determines if the user session contained in the X-User-Session header check out
func AuthUserBySessionHeader(headerValue string) (*data.User, error) {
	// Extract session from the header value
	if userID, sessionID, err := ExtractUserSessionIDs(headerValue); err == nil {

		// If it's an anonymous user
		if *userID == data.AnonymousUser.ID {
			return data.AnonymousUser, nil
		}

		// Find the user
		if user, err := svc.TheUserService.FindUserBySession(userID, sessionID); err == nil {
			// Verify the user is allowed to authenticate
			if errm, _ := Verifier.UserCanAuthenticate(user, true); errm == nil {
				// Succeeded
				return user, nil
			}
		}
	}

	// Authentication failed
	return nil, ErrUnauthorised
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

// FetchUserSessionFromCookie extracts user ID and session ID from a session cookie contained in the given request
func FetchUserSessionFromCookie(r *http.Request) (*uuid.UUID, *uuid.UUID, error) {
	// Extract user-session data from the cookie
	cookie, err := r.Cookie(util.CookieNameUserSession)
	if err != nil {
		return nil, nil, err
	}

	// Decode and parse the value
	return ExtractUserSessionIDs(cookie.Value)
}

// GetUserFromSessionCookie parses the session cookie contained in the given request and returns the corresponding user
func GetUserFromSessionCookie(r *http.Request) (*data.User, error) {
	// Extract session from the cookie
	userID, sessionID, err := FetchUserSessionFromCookie(r)
	if err != nil {
		return nil, err
	}

	// Find the user
	user, err := svc.TheUserService.FindUserBySession(userID, sessionID)
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
