package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_embed"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
)

func EmbedAuthLogin(params api_embed.EmbedAuthLoginParams) middleware.Responder {
	// Log the user in
	user, us, r := loginLocalUser(
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
	return authCreateUserSession(api_embed.NewEmbedAuthLoginOK(), user, us, du)
}

func EmbedAuthLoginTokenRedeem(params api_embed.EmbedAuthLoginTokenRedeemParams, user *data.User) middleware.Responder {
	// Verify the user can log in and create a new session
	host := string(params.Body.Host)
	us, r := loginUser(user, host, params.HTTPRequest)
	if r != nil {
		return r
	}

	// Find the domain user, creating one if necessary
	_, du, err := svc.TheDomainService.FindDomainUserByHost(host, &user.ID, true)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return authCreateUserSession(api_embed.NewEmbedAuthLoginTokenRedeemOK(), user, us, du)
}

func EmbedAuthSignup(params api_embed.EmbedAuthSignupParams) middleware.Responder {
	// Verify new users are allowed
	if r := Verifier.SignupEnabled(); r != nil {
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
		WithSignup(params.HTTPRequest, data.URIPtrToString(params.Body.URL)).
		WithWebsiteURL(string(params.Body.WebsiteURL))

	// If no operational mailer is configured, or confirmation is switched off in the config, mark the user confirmed
	// right away
	if !util.TheMailer.Operational() ||
		!svc.TheDynConfigService.GetBool(data.ConfigKeyAuthSignupConfirmCommenter) {
		user.WithConfirmed(true)
	}

	// Sign-up the new user
	if r := signupUser(user); r != nil {
		return r
	}

	// Succeeded
	return api_embed.NewEmbedAuthSignupOK().WithPayload(&api_embed.EmbedAuthSignupOKBody{IsConfirmed: user.Confirmed})
}

func EmbedAuthCurUserUpdate(params api_embed.EmbedAuthCurUserUpdateParams, user *data.User) middleware.Responder {
	// Parse page ID
	var du *data.DomainUser
	if pageID, r := parseUUIDPtr(params.Body.PageID); r != nil {
		return r

		// If there's no page
	} else if pageID == nil {
		return respBadRequest(ErrorInvalidPropertyValue.WithDetails("pageId"))

		// Find the page
	} else if page, err := svc.ThePageService.FindByID(pageID); err != nil {
		return respServiceError(err)

		// Fetch the domain user
	} else if _, du, err = svc.TheDomainService.FindDomainUserByID(&page.DomainID, &user.ID); err != nil {
		return respServiceError(err)
	}

	// Update the domain user, if needed
	if du.NotifyReplies != params.Body.NotifyReplies || du.NotifyModerator != params.Body.NotifyModerator {
		du.NotifyReplies = params.Body.NotifyReplies
		du.NotifyModerator = params.Body.NotifyModerator
		if err := svc.TheDomainService.UserModify(du); err != nil {
			return respServiceError(err)
		}
	}

	// Succeeded
	return api_embed.NewEmbedAuthCurUserUpdateNoContent()
}
