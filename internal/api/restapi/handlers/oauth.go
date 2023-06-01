package handlers

import (
	"encoding/base64"
	"errors"
	"fmt"
	"github.com/go-openapi/runtime/middleware"
	"github.com/google/uuid"
	"github.com/markbates/goth"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_auth"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"net/http"
	"net/url"
)

/* TODO new-db

type ssoPayload struct {
	Domain string `json:"domain"`
	Token  string `json:"token"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	Link   string `json:"link"`
	Photo  string `json:"photo"`
}

// oauthSessions stores initiated OAuth (federated authentication) sessions
var oauthSessions = &util.SafeStringMap[models.HexID]{}

// commenterTokens maps temporary OAuth token to the related CommenterToken. It's required for those nasty identity
// providers that don't support the state parameter (such as Twitter)
var commenterTokens = &util.SafeStringMap[models.HexID]{}
*/

// AuthOauthInit initiates a federated authentication process
func AuthOauthInit(params api_auth.AuthOauthInitParams) middleware.Responder {
	// Find the provider
	provider, r := Verifier.FederatedIdProvider(models.FederatedIdpID(params.Provider))
	if r != nil {
		return r
	}

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

	// Fetch the redirection URL
	sessURL, err := sess.GetAuthURL()
	if err != nil {
		logger.Warningf("AuthOauthInit(): sess.GetAuthURL() failed: %v", err)
		return respInternalError(nil)
	}

	// Store the session in the cookie/DB
	authSession, err := svc.TheAuthSessionService.Create(sess.Marshal(), data.URIPtrToString(params.URL))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded: redirect the user to the federated identity provider, setting the state cookie
	return NewCookieResponder(api_auth.NewAuthOauthInitTemporaryRedirect().WithLocation(sessURL)).
		WithCookie(util.CookieNameAuthSession, authSession.ID.String(), "/", util.AuthSessionDuration, true, http.SameSiteLaxMode)
}

func AuthOauthCallback(params api_auth.AuthOauthCallbackParams) middleware.Responder {
	// Authenticate the user
	user, host, r := oauthAuthenticate(params.Provider, params.HTTPRequest)
	if r != nil {
		return r
	}

	// Create a user session
	us := data.NewUserSession(&user.ID, host, params.HTTPRequest)
	if err := svc.TheUserService.CreateUserSession(us); err != nil {
		return respServiceError(err)
	}

	// Succeeded: close the parent window, removing the auth session cookie
	return NewCookieResponder(closeParentWindowResponse(us)).WithoutCookie(util.CookieNameAuthSession, "/")
}

func AuthOauthSsoCallback(params api_auth.AuthOauthSsoCallbackParams) middleware.Responder {
	/* TODO new-db
	payloadBytes, err := hex.DecodeString(params.Payload)
	if err != nil {
		return oauthFailure(fmt.Errorf("payload: invalid hex encoding: %s", err.Error()))
	}

	signatureBytes, err := hex.DecodeString(params.Hmac)
	if err != nil {
		return oauthFailure(fmt.Errorf("HMAC signature: invalid hex encoding: %s", err.Error()))
	}

	payload := ssoPayload{}
	err = json.Unmarshal(payloadBytes, &payload)
	if err != nil {
		return oauthFailure(fmt.Errorf("payload: failed to unmarshal: %s", err.Error()))
	}

	// Validate payload fields
	if payload.Token == "" {
		return oauthFailure(errors.New("token is missing in the payload"))
	}
	if payload.Email == "" {
		return oauthFailure(errors.New("email is missing in the payload"))
	}
	if payload.Name == "" {
		return oauthFailure(errors.New("name is missing in the payload"))
	}

	// Fetch domain/commenter token for the token, removing the token
	domainName, commenterToken, err := svc.TheDomainService.TakeSSOToken(models.HexID(payload.Token))
	if err != nil {
		return oauthFailure(err)
	}

	// Fetch the domain
	domain, err := svc.TheDomainService.FindByHost(domainName)
	if err != nil {
		return oauthFailure(err)
	}

	// Verify the domain's SSO config is complete
	if err := validateDomainSSOConfig(domain); err != nil {
		return oauthFailure(err)
	}

	key, err := hex.DecodeString(domain.SsoSecret)
	if err != nil {
		logger.Errorf("cannot decode SSO secret as hex: %v", err)
		return oauthFailure(err)
	}

	h := hmac.New(sha256.New, key)
	h.Write(payloadBytes)
	expectedSignatureBytes := h.Sum(nil)
	if !hmac.Equal(expectedSignatureBytes, signatureBytes) {
		return oauthFailure(fmt.Errorf("HMAC signature verification failed"))
	}

	// Try to find the corresponding commenter by their token
	if _, err := svc.TheUserService.FindCommenterByToken(commenterToken); err != nil && err != svc.ErrNotFound {
		return oauthFailure(err)
	}

	// Now try to find an existing commenter by their email
	var commenterHex models.HexID
	idp := "sso:" + string(domain.Host)
	if commenter, err := svc.TheUserService.FindCommenterByIdPEmail(idp, payload.Email, false); err == nil {
		// Commenter found
		commenterHex = commenter.HexID

	} else if err != svc.ErrNotFound {
		// Any other error than "not found"
		return oauthFailure(err)
	}

	// No such commenter yet: it's a signup
	if commenterHex == "" {
		// Create a new commenter
		if c, err := svc.TheUserService.CreateCommenter(payload.Email, payload.Name, payload.Link, payload.Photo, idp, ""); err != nil {
			return oauthFailure(err)
		} else {
			commenterHex = c.HexID
		}

		// Commenter already exists: it's a login. Update commenter's details
	} else if err := svc.TheUserService.UpdateCommenter(commenterHex, payload.Email, payload.Name, payload.Link, payload.Photo, idp); err != nil {
		return oauthFailure(err)
	}

	// Link the commenter to the session token
	if err := svc.TheUserService.UpdateCommenterSession(commenterToken, commenterHex); err != nil {
		return oauthFailure(err)
	}
	*/
	// Succeeded: close the parent window
	return closeParentWindowResponse(nil) // TODO new-db must pass a user session here
}

func AuthOauthSsoInit(params api_auth.AuthOauthSsoInitParams) middleware.Responder {
	/* TODO new-db
	domainURL, err := util.ParseAbsoluteURL(params.HTTPRequest.Header.Get("Referer"))
	if err != nil {
		return oauthFailure(err)
	}

	// Try to find the commenter by token
	commenterToken := models.HexID(params.Token)
	if _, err = svc.TheUserService.FindCommenterByToken(commenterToken); err != nil && err != svc.ErrNotFound {
		return oauthFailure(err)
	}

	// Fetch the domain
	domain, err := svc.TheDomainService.FindByHost(models.Host(domainURL.Host))
	if err != nil {
		return respServiceError(err)
	}

	// Make sure the domain allows SSO authentication
	found := false
	for _, id := range domain.Idps {
		if id == models.IdentityProviderIDSso {
			found = true
			break
		}
	}
	if !found {
		return oauthFailure(fmt.Errorf("SSO not configured for %s", domain.Host))
	}

	// Verify the domain's SSO config is complete
	if err := validateDomainSSOConfig(domain); err != nil {
		return oauthFailure(err)
	}

	key, err := hex.DecodeString(domain.SsoSecret)
	if err != nil {
		logger.Errorf("AuthOauthSsoInit: failed to decode SSO secret: %v", err)
		return oauthFailure(err)
	}

	// Create and persist a new SSO token
	token, err := svc.TheDomainService.CreateSSOToken(domain.Host, commenterToken)
	if err != nil {
		return oauthFailure(err)
	}

	tokenBytes, err := hex.DecodeString(string(token))
	if err != nil {
		logger.Errorf("AuthOauthSsoInit: failed to decode SSO token: %v", err)
		return oauthFailure(err)
	}

	// Parse the domain's SSO URL
	ssoURL, err := util.ParseAbsoluteURL(string(domain.SsoURL))
	if err != nil {
		logger.Errorf("AuthOauthSsoInit: failed to parse SSO URL: %v", err)
		return oauthFailure(err)
	}

	// Generate a new HMAC signature hash
	h := hmac.New(sha256.New, key)
	h.Write(tokenBytes)
	signature := hex.EncodeToString(h.Sum(nil))

	// Add the token and the signature to the SSO URL
	q := ssoURL.Query()
	q.Set("token", string(token))
	q.Set("hmac", signature)
	ssoURL.RawQuery = q.Encode()
	*/
	// Succeeded: redirect to SSO
	return api_auth.NewAuthOauthSsoInitTemporaryRedirect() // TODO new-db .WithLocation(ssoURL.String())
}

// oauthAuthenticate tries to authenticate user with the given federated auth provider, and returns either an
// authenticated user and source host, or an error responder
func oauthAuthenticate(providerID string, req *http.Request) (*data.User, string, middleware.Responder) {
	// Get the registered provider instance by its name (coming from the path parameter)
	// Find the provider
	provider, r := Verifier.FederatedIdProvider(models.FederatedIdpID(providerID))
	if r != nil {
		return nil, "", r
	}

	// Obtain the auth session ID from the cookie
	var authSession *data.AuthSession
	var host string
	if cookie, err := req.Cookie(util.CookieNameAuthSession); err != nil {
		logger.Debugf("Auth session cookie error: %v", err)
		return nil, "", oauthFailure(errors.New("auth session cookie missing"))

		// Parse the session ID
	} else if authSessID, err := uuid.Parse(cookie.Value); err != nil {
		logger.Debugf("Invalid auth session ID in cookie: %v", err)
		return nil, "", oauthFailure(errors.New("invalid auth session ID"))

		// Find and delete the session
	} else if authSession, err = svc.TheAuthSessionService.TakeByID(&authSessID); err == svc.ErrNotFound {
		logger.Debugf("No auth session found with ID=%v: %v", authSessID, err)
		return nil, "", oauthFailure(errors.New("auth session not found"))

	} else if err != nil {
		// Any other DB-related error
		return nil, "", oauthFailure(err)

		// Parse the source URL to extract the host
	} else if su, err := url.Parse(authSession.SourceURL); err != nil {
		return nil, "", oauthFailure(err)

	} else {
		// Store the host
		host = su.Host
	}

	// Recover the original provider session
	sess, err := provider.UnmarshalSession(authSession.Data)
	if err != nil {
		logger.Debugf("provider.UnmarshalSession() failed: %v", err)
		return nil, "", oauthFailure(errors.New("auth session unmarshalling"))
	}

	// Validate the session state
	if err := validateAuthSessionState(sess, req); err != nil {
		return nil, "", oauthFailure(err)
	}

	// Obtain the tokens
	reqParams := req.URL.Query()
	_, err = sess.Authorize(provider, reqParams)
	if err != nil {
		logger.Debugf("sess.Authorize() failed: %v", err)
		return nil, "", oauthFailure(errors.New("auth session unauthorised"))
	}

	// Fetch the federated user
	fedUser, err := provider.FetchUser(sess)
	if err != nil {
		logger.Debugf("provider.FetchUser() failed: %v", err)
		return nil, "", oauthFailure(errors.New("fetching user"))
	}

	// Validate the returned user
	// -- UserID
	if fedUser.UserID == "" {
		return nil, "", oauthFailure(errors.New("user ID missing"))
	}
	// -- Email
	if fedUser.Email == "" {
		return nil, "", oauthFailure(errors.New("user email missing"))
	}
	// -- Name
	if fedUser.Name == "" {
		return nil, "", oauthFailure(errors.New("user name missing"))
	}

	// Try to find an existing user by email
	isNew := false
	if u, err := svc.TheUserService.FindUserByEmail(fedUser.Email, false); err == svc.ErrNotFound {
		// No such email/user
		isNew = true
	} else if err != nil {
		// Any other DB error
		return nil, "", respServiceError(err)

		// Email found. If a local account exists
	} else if u.IsLocal() {
		return nil, "", oauthFailure(ErrorLoginLocally.Error())

		// Existing account is a federated one. Make sure the user isn't changing their IdP
	} else if u.FederatedIdP != providerID {
		return nil, "", oauthFailure(ErrorLoginUsingIdP.WithDetails(u.FederatedIdP).Error())
	}

	// If it's a new user, i.e. a signup
	var user *data.User
	if isNew {
		// Insert a new user
		user = data.NewUser(fedUser.Email, fedUser.Name).
			WithConfirmed(true). // Confirm the user right away as we trust the IdP
			WithSignup(req, authSession.SourceURL).
			WithFederated(fedUser.UserID, providerID)
		if err := svc.TheUserService.Create(user); err != nil {
			return nil, "", respServiceError(err)
		}

		// It's an existing user. Verify they're allowed to log in
	} else if _, r := Verifier.UserCanAuthenticate(user, true); r != nil {
		return nil, "", r

		// Update user details
	} else {
		user.
			WithEmail(fedUser.Email).
			WithName(fedUser.Name).
			WithFederated(fedUser.UserID, providerID)
		if err := svc.TheUserService.Update(user); err != nil {
			return nil, "", respServiceError(err)
		}
	}

	// TODO new-db fetch and update the avatar

	// Succeeded
	return user, host, nil
}

// oauthFailure returns a generic "Unauthorized" responder, with the error message in the details. Also wipes out any
// auth session cookie
func oauthFailure(err error) middleware.Responder {
	return NewCookieResponder(
		api_auth.NewAuthOauthInitUnauthorized().
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

/* TODO new-db

// getSessionState extracts the state parameter from the given session's URL
func getSessionState(sess goth.Session) (string, error) {
	// Fetch the original session's URL
	rawAuthURL, err := sess.GetAuthURL()
	if err != nil {
		return "", err
	}

	// Parse it
	authURL, err := url.Parse(rawAuthURL)
	if err != nil {
		return "", err
	}

	// Extract the state param
	return authURL.Query().Get("state"), nil
}

// validateDomainSSOConfig verifies the SSO configuration of the domain is valid
func validateDomainSSOConfig(domain *models.Domain) error {
	if domain.SsoSecret == "" {
		return errors.New("domain SSO secret is not configured")
	}
	if domain.SsoURL == "" {
		return errors.New("domain SSO URL is not configured")
	}
	return nil
}
*/
