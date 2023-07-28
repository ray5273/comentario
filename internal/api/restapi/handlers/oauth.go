package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"github.com/markbates/goth"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"net/http"
	"net/url"
)

type ssoPayload struct {
	Domain string `json:"domain"`
	Token  string `json:"token"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	Link   string `json:"link"`
	Photo  string `json:"photo"`
}

func AuthOauthCallback(params api_general.AuthOauthCallbackParams) middleware.Responder {
	// SSO authentication is a special case
	var provider goth.Provider
	var r middleware.Responder
	if params.Provider == "sso" {

		// Otherwise it's a goth provider: find it
	} else if provider, r = Verifier.FederatedIdProvider(models.FederatedIdpID(params.Provider)); r != nil {
		return r
	}

	// Obtain the auth session ID from the cookie
	var authSession *data.AuthSession
	if cookie, err := params.HTTPRequest.Cookie(util.CookieNameAuthSession); err != nil {
		logger.Debugf("Auth session cookie error: %v", err)
		return oauthFailure(errors.New("auth session cookie missing"))

		// Parse the session ID
	} else if authSessID, err := uuid.Parse(cookie.Value); err != nil {
		logger.Debugf("Invalid auth session ID in cookie: %v", err)
		return oauthFailure(errors.New("invalid auth session ID"))

		// Find and delete the session
	} else if authSession, err = svc.TheAuthSessionService.TakeByID(&authSessID); err == svc.ErrNotFound {
		logger.Debugf("No auth session found with ID=%v: %v", authSessID, err)
		return oauthFailure(errors.New("auth session not found"))

	} else if err != nil {
		// Any other DB-related error
		return oauthFailure(err)
	}

	// Obtain the token linked by the auth session
	token, err := svc.TheTokenService.FindByValue(authSession.TokenValue, false)
	if err != nil {
		return oauthFailure(err)

		// Make sure the token is still anonymous
	} else if !token.IsAnonymous() {
		logger.Debugf("Token isn't anonymous but belongs to user %v", &token.Owner)
		return oauthFailure(ErrorBadToken.Error())
	}

	reqParams := params.HTTPRequest.URL.Query()
	var fedUser goth.User

	// SSO auth
	if provider == nil {
		// Find the domain the user is authenticating on
		domain, err := svc.TheDomainService.FindByHost(authSession.Host)
		if err != nil {
			return oauthFailure(err)
		}

		// Validate domain SSO config
		if r := Verifier.DomainSSOConfig(domain); r != nil {
			return r
		}

		// Verify the payload
		payload := ssoPayload{}
		var payloadBytes []byte
		if s := reqParams.Get("payload"); s == "" {
			return oauthFailure(errors.New("payload is missing"))
		} else if payloadBytes, err = hex.DecodeString(s); err != nil {
			return oauthFailure(fmt.Errorf("payload: invalid hex encoding: %s", err.Error()))
		} else if err = json.Unmarshal(payloadBytes, &payload); err != nil {
			return oauthFailure(fmt.Errorf("payload: failed to unmarshal: %s", err.Error()))
		} else if payload.Token != token.String() {
			return oauthFailure(errors.New("payload: invalid token"))
		}

		// Verify the HMAC signature
		if s := reqParams.Get("hmac"); s == "" {
			return oauthFailure(errors.New("hmac is missing"))
		} else if signature, err := hex.DecodeString(s); err != nil {
			return oauthFailure(fmt.Errorf("hmac: invalid hex encoding: %s", err.Error()))
		} else {
			h := hmac.New(sha256.New, domain.SSOSecret)
			h.Write(payloadBytes)
			if !hmac.Equal(h.Sum(nil), signature) {
				return oauthFailure(fmt.Errorf("hmac: signature verification failed"))
			}
		}

		// Prepare a federated user
		fedUser = goth.User{
			Email:     payload.Email,
			Name:      payload.Name,
			UserID:    payload.Email,
			AvatarURL: payload.Photo,
		}

		// Non-SSO auth
	} else {
		// Recover the original provider session
		sess, err := provider.UnmarshalSession(authSession.Data)
		if err != nil {
			logger.Debugf("provider.UnmarshalSession() failed: %v", err)
			return oauthFailure(errors.New("auth session unmarshalling"))
		}

		// Validate the session state
		if err := validateAuthSessionState(sess, params.HTTPRequest); err != nil {
			return oauthFailure(err)
		}

		// Obtain the OAuth tokens
		_, err = sess.Authorize(provider, reqParams)
		if err != nil {
			logger.Debugf("sess.Authorize() failed: %v", err)
			return oauthFailure(errors.New("auth session unauthorised"))
		}

		// Fetch the federated user
		fedUser, err = provider.FetchUser(sess)
		if err != nil {
			logger.Debugf("provider.FetchUser() failed: %v", err)
			return oauthFailure(errors.New("fetching user"))
		}
	}

	// Validate the federated user
	// -- UserID
	if fedUser.UserID == "" {
		return oauthFailure(errors.New("user ID missing"))
	}
	// -- Email
	if fedUser.Email == "" {
		return oauthFailure(errors.New("user email missing"))
	}
	// -- Name
	if fedUser.Name == "" {
		return oauthFailure(errors.New("user name missing"))
	}

	// Try to find an existing user by email
	var user *data.User
	if user, err = svc.TheUserService.FindUserByEmail(fedUser.Email, false); err == svc.ErrNotFound {
		// No such email/user: it's a signup. Insert a new user
		user = data.NewUser(fedUser.Email, fedUser.Name).
			WithConfirmed(true). // Confirm the user right away as we trust the IdP
			WithSignup(params.HTTPRequest, authSession.Host).
			WithFederated(fedUser.UserID, params.Provider)
		if err := svc.TheUserService.Create(user); err != nil {
			return respServiceError(err)
		}

	} else if err != nil {
		// Any other DB error
		return respServiceError(err)

		// Email found. If a local account exists
	} else if user.IsLocal() {
		return oauthFailure(ErrorLoginLocally.Error())

		// Existing account is a federated one. Make sure the user isn't changing their IdP
	} else if user.FederatedIdP != params.Provider {
		return oauthFailure(ErrorLoginUsingIdP.WithDetails(user.FederatedIdP).Error())

		// Verify they're allowed to log in
	} else if _, r := Verifier.UserCanAuthenticate(user, true); r != nil {
		return r

	} else {
		// Update user details
		user.
			WithEmail(fedUser.Email).
			WithName(fedUser.Name).
			WithFederated(fedUser.UserID, params.Provider)
		if err := svc.TheUserService.Update(user); err != nil {
			return respServiceError(err)
		}
	}

	// If there's an avatar URL, fetch and update the avatar, in the background (ignore any errors)
	if fedUser.AvatarURL != "" {
		//goland:noinspection GoUnhandledErrorResult
		go svc.TheAvatarService.DownloadAndUpdateByUserID(&user.ID, fedUser.AvatarURL)
	}

	// Update the token by binding it to the authenticated user
	token.Owner = user.ID
	if err := svc.TheTokenService.Update(token); err != nil {
		return respServiceError(err)
	}

	// Succeeded: close the parent window, removing the auth session cookie
	return NewCookieResponder(closeParentWindowResponse()).WithoutCookie(util.CookieNameAuthSession, "/")
}

// AuthOauthInit initiates a federated authentication process
func AuthOauthInit(params api_general.AuthOauthInitParams) middleware.Responder {
	// SSO authentication is a special case
	var provider goth.Provider
	var r middleware.Responder
	host := swag.StringValue(params.Host)
	if params.Provider == "sso" {
		// Verify there's a host specified
		if host == "" {
			return respBadRequest(ErrorInvalidPropertyValue.WithDetails("host"))
		}

		// Otherwise it's a goth provider: find it
	} else if provider, r = Verifier.FederatedIdProvider(models.FederatedIdpID(params.Provider)); r != nil {
		return r
	}

	// Try to find the passed anonymous token
	token, err := svc.TheTokenService.FindByStrValue(params.Token, false)
	if err != nil {
		return respBadRequest(ErrorBadToken)
	}

	// Make sure the token is anonymous
	if !token.IsAnonymous() {
		return respBadRequest(ErrorBadToken)
	}

	// SSO auth
	var authURL, sessionData string
	if provider == nil {
		// Find the domain the user is authenticating on
		domain, err := svc.TheDomainService.FindByHost(host)
		if err != nil {
			return oauthFailure(err)
		}

		// Validate domain SSO config
		if r := Verifier.DomainSSOConfig(domain); r != nil {
			return r
		}

		// Parse the SSO URL
		ssoURL, err := util.ParseAbsoluteURL(domain.SSOURL, false)
		if err != nil {
			return oauthFailure(err)
		}

		// Generate a new HMAC signature
		h := hmac.New(sha256.New, domain.SSOSecret)
		h.Write(token.Value)
		signature := hex.EncodeToString(h.Sum(nil))

		// Add the token and the signature to the SSO URL
		q := ssoURL.Query()
		q.Set("token", token.String())
		q.Set("hmac", signature)
		ssoURL.RawQuery = q.Encode()
		authURL = ssoURL.String()

		// Non-SSO auth
	} else {
		// Generate a random base64-encoded nonce to use as the state on the auth URL
		var state string
		if b, err := util.RandomBytes(64); err != nil {
			logger.Warningf("AuthOauthInit(): RandomBytes() failed: %v", err)
			return respInternalError(nil)
		} else {
			state = base64.URLEncoding.EncodeToString(b)
		}

		// Initiate an authentication session
		sess, err := provider.BeginAuth(state)
		if err != nil {
			logger.Warningf("AuthOauthInit(): provider.BeginAuth() failed: %v", err)
			return respInternalError(nil)
		}

		// Fetch the URL for authenticating with the provider
		authURL, err = sess.GetAuthURL()
		if err != nil {
			logger.Warningf("AuthOauthInit(): sess.GetAuthURL() failed: %v", err)
			return respInternalError(nil)
		}

		// Serialise the session for persisting
		sessionData = sess.Marshal()
	}

	// Store the session in the cookie/DB
	authSession, err := svc.TheAuthSessionService.Create(sessionData, host, token.Value)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded: redirect the user to the federated identity provider, setting the state cookie
	return NewCookieResponder(api_general.NewAuthOauthInitTemporaryRedirect().WithLocation(authURL)).
		WithCookie(util.CookieNameAuthSession, authSession.ID.String(), "/", util.AuthSessionDuration, true, http.SameSiteLaxMode)
}

// oauthFailure returns a generic "Unauthorized" responder, with the error message in the details. Also wipes out any
// auth session cookie
func oauthFailure(err error) middleware.Responder {
	return NewCookieResponder(
		api_general.NewAuthOauthInitUnauthorized().
			WithPayload(fmt.Sprintf(
				`<html lang="en">
				<head>
					<title>401 Unauthorized</title>
				</head>
				<body>
					<h1>Unauthorized</h1>
					<p>Federated authentication failed with the error: %s</p>
				</body>
				</html>`,
				err.Error()))).
		WithoutCookie(util.CookieNameAuthSession, "/")
}

// validateAuthSessionState verifies the session token initially submitted, if any, is matching the one returned with
// the given callback request
func validateAuthSessionState(sess goth.Session, req *http.Request) error {
	// Fetch the original session's URL
	rawAuthURL, err := sess.GetAuthURL()
	if err != nil {
		return err
	}

	// Parse it
	authURL, err := url.Parse(rawAuthURL)
	if err != nil {
		return err
	}

	// If there was a state initially, the value returned with the request must be the same
	if originalState := authURL.Query().Get("state"); originalState != "" {
		if reqState := req.URL.Query().Get("state"); reqState != originalState {
			logger.Debugf("Auth session state mismatch: want '%s', got '%s'", originalState, reqState)
			return errors.New("auth session state mismatch")
		}
	}
	return nil
}
