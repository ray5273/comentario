package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_embed"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"strings"
)

func EmbedAuthLogin(params api_embed.EmbedAuthLoginParams) middleware.Responder {
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
	return api_embed.NewEmbedAuthLoginOK().WithPayload(&api_embed.EmbedAuthLoginOKBody{
		SessionToken: session.EncodeIDs(),
		Principal:    user.ToPrincipal(du),
	})
}

func EmbedAuthLogout(params api_embed.EmbedAuthLogoutParams, user *data.User) middleware.Responder {
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
	return api_embed.NewEmbedAuthLogoutNoContent()
}

func EmbedAuthSignup(params api_embed.EmbedAuthSignupParams) middleware.Responder {
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
	return api_embed.NewEmbedAuthSignupOK().WithPayload(&api_embed.EmbedAuthSignupOKBody{IsConfirmed: user.Confirmed})
}

func EmbedAuthPwdResetSendEmail(params api_embed.EmbedAuthPwdResetSendEmailParams) middleware.Responder {
	if r := sendPasswordResetEmail(data.EmailPtrToString(params.Body.Email)); r != nil {
		return r
	}

	// Succeeded
	return api_embed.NewEmbedAuthPwdResetSendEmailNoContent()
}

func EmbedAuthCurUserGet(params api_embed.EmbedAuthCurUserGetParams) middleware.Responder {
	// Fetch the session header value
	if s := params.HTTPRequest.Header.Get(util.HeaderUserSession); s != "" {
		// Try to fetch the user
		if user, userSession, err := FetchUserBySessionHeader(s); err == nil && !user.IsAnonymous() && userSession != nil {
			// User is authenticated. Try to find the corresponding domain user by the host stored in the session
			if _, domainUser, err := svc.TheDomainService.FindDomainUserByHost(userSession.Host, &user.ID, true); err == nil {
				// Succeeded: user is authenticated
				return api_embed.NewEmbedAuthCurUserGetOK().WithPayload(user.ToPrincipal(domainUser))
			}
		}
	}

	// Not logged in, bad header value, the user is anonymous or doesn't exist, or domain was deleted
	return api_embed.NewEmbedAuthCurUserGetNoContent()
}

func EmbedAuthCurUserUpdate(params api_embed.EmbedAuthCurUserUpdateParams, user *data.User) middleware.Responder {
	// Verify the user is authenticated
	if r := Verifier.UserIsAuthenticated(user); r != nil {
		return r
	}

	// Parse page ID
	var domainUser *data.DomainUser
	if pageID, err := data.DecodeUUID(*params.Body.PageID); err != nil {
		return respBadRequest(ErrorInvalidUUID)

		// Find the page
	} else if page, err := svc.ThePageService.FindByID(pageID); err != nil {
		return respServiceError(err)

		// Fetch the domain user
	} else if _, domainUser, err = svc.TheDomainService.FindDomainUserByID(&page.DomainID, &user.ID); err != nil {
		return respServiceError(err)
	}

	// If user is local, update their profile
	if user.IsLocal() {
		name := strings.TrimSpace(params.Body.Name)
		wURL := string(params.Body.WebsiteURL)
		if name == "" {
			return respBadRequest(ErrorInvalidPropertyValue.WithDetails("name"))
		}

		// Update user properties
		if name != user.Name || wURL != user.WebsiteURL {
			if err := svc.TheUserService.UpdateLocalUser(user.WithName(name).WithWebsiteURL(wURL)); err != nil {
				return respServiceError(err)
			}
		}
	}

	// Update the domain user, if needed
	if domainUser.NotifyReplies != params.Body.NotifyReplies || domainUser.NotifyModerator != params.Body.NotifyModerator {
		domainUser.NotifyReplies = params.Body.NotifyReplies
		domainUser.NotifyModerator = params.Body.NotifyModerator
		if err := svc.TheDomainService.UserModify(domainUser); err != nil {
			return respServiceError(err)
		}
	}

	// Succeeded
	return api_embed.NewEmbedAuthCurUserUpdateNoContent()
}
