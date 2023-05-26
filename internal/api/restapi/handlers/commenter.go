package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_commenter"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
)

func CommenterLogin(params api_commenter.CommenterLoginParams) middleware.Responder {
	// Log the user in
	user, session, r := loginLocalUser(
		data.EmailPtrToString(params.Body.Email),
		swag.StringValue(params.Body.Password),
		string(params.Body.Host),
		params.HTTPRequest)
	if r != nil {
		return r
	}

	// Find the domain user, creating one if necessary
	_, du, err := svc.TheDomainService.FindDomainUserByHost(string(params.Body.Host), &user.ID, true)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_commenter.NewCommenterLoginOK().WithPayload(&api_commenter.CommenterLoginOKBody{
		SessionToken: session.EncodeIDs(),
		Principal:    user.ToPrincipal(du),
	})
}

func CommenterLogout(params api_commenter.CommenterLogoutParams, user *data.User) middleware.Responder {
	// Verify the user is authenticated
	if r := Verifier.UserIsAuthenticated(user); r != nil {
		return r
	}

	// Extract session from the session header
	_, sessionID, err := ExtractUserSessionIDs(params.HTTPRequest.Header.Get(util.HeaderUserSession))
	if err != nil {
		return respUnauthorized(nil)
	}

	// Delete the session token, ignoring any error
	_ = svc.TheUserService.DeleteUserSession(sessionID)

	// Regardless of whether the above was successful, return a success response
	return api_commenter.NewCommenterLogoutNoContent()
}

func CommenterSignup(params api_commenter.CommenterSignupParams) middleware.Responder {
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
		WithSignup(params.HTTPRequest, data.URIPtrToString(params.Body.URL)).
		WithWebsiteURL(string(params.Body.WebsiteURL)).
		// If SMTP isn't configured, mark the user as confirmed right away
		WithConfirmed(!config.SMTPConfigured)

	// Save the new user
	if err := svc.TheUserService.CreateUser(user); err != nil {
		return respServiceError(err)
	}

	// Send a confirmation email if needed
	if r := sendConfirmationEmail(user); r != nil {
		return r
	}

	// Succeeded
	return api_commenter.NewCommenterSignupOK().WithPayload(&api_commenter.CommenterSignupOKBody{IsConfirmed: user.Confirmed})
}

func CommenterPwdResetSendEmail(params api_commenter.CommenterPwdResetSendEmailParams) middleware.Responder {
	if r := sendPasswordResetEmail(data.EmailPtrToString(params.Body.Email)); r != nil {
		return r
	}

	// Succeeded
	return api_commenter.NewCommenterPwdResetSendEmailNoContent()
}

func CommenterSelf(params api_commenter.CommenterSelfParams) middleware.Responder {
	// Fetch the session header value
	if s := params.HTTPRequest.Header.Get(util.HeaderUserSession); s != "" {
		// Try to fetch the user
		if user, userSession, err := FetchUserBySessionHeader(s); err == nil && !user.IsAnonymous() && userSession != nil {
			// User is authenticated. Try to find the corresponding domain user by the host stored in the session
			if _, domainUser, err := svc.TheDomainService.FindDomainUserByHost(userSession.Host, &user.ID, true); err == nil {
				// Succeeded: user is authenticated
				return api_commenter.NewCommenterSelfOK().WithPayload(user.ToPrincipal(domainUser))
			}
		}
	}

	// Not logged in, bad header value, the user is anonymous or doesn't exist, or domain was deleted
	return api_commenter.NewCommenterSelfNoContent()
}

func CommenterUpdate(params api_commenter.CommenterUpdateParams, user *data.User) middleware.Responder {
	// Verify the user is authenticated and local
	if r := Verifier.UserIsAuthenticated(user); r != nil {
		return r
	} else if r := Verifier.UserIsLocal(user); r != nil {
		return r
	}

	// Update the user
	err := svc.TheUserService.UpdateLocalUser(
		user.
			WithEmail(data.EmailPtrToString(params.Body.Email)).
			WithName(data.TrimmedString(params.Body.Name)).
			WithWebsiteURL(string(params.Body.WebsiteURL)))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_commenter.NewCommenterUpdateNoContent()
}
