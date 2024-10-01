package handlers

import (
	"errors"
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"time"
)

func CurUserGet(params api_general.CurUserGetParams) middleware.Responder {
	// Try to authenticate the user
	user, err := svc.TheAuthService.GetUserBySessionCookie(params.HTTPRequest)
	if errors.Is(err, svc.ErrDB) {
		// Houston, we have a problem
		return respInternalError(nil)
	} else if err != nil {
		// Authentication failed for whatever reason
		return api_general.NewCurUserGetNoContent()
	}

	// Succeeded: owner's logged in
	return api_general.NewCurUserGetOK().WithPayload(user.ToPrincipal(nil))
}

func CurUserSetAvatar(params api_general.CurUserSetAvatarParams, user *data.User) middleware.Responder {
	if params.Data != nil {
		defer util.LogError(params.Data.Close, "CurUserSetAvatar, params.Data.Close()")
	}

	// Update the user's avatar, marking it as customised
	if err := svc.TheAvatarService.UpdateByUserID(&user.ID, params.Data, true); err != nil {
		return respServiceError(err)
	}

	// Succeeded: owner's logged in
	return api_general.NewCurUserSetAvatarNoContent()
}

func CurUserSetAvatarFromGravatar(_ api_general.CurUserSetAvatarFromGravatarParams, user *data.User) middleware.Responder {
	// Download and update the user's avatar, marking it as customised
	if err := svc.TheAvatarService.SetFromGravatar(&user.ID, user.Email, true); err != nil {
		return respServiceError(err)
	}

	// Succeeded: owner's logged in
	return api_general.NewCurUserSetAvatarFromGravatarNoContent()
}

func CurUserUpdate(params api_general.CurUserUpdateParams, user *data.User) middleware.Responder {
	// Verify it's a local user
	if r := Verifier.UserIsLocal(user); r != nil {
		return r
	}

	// If the password is getting changed, verify the current password
	if params.Body.NewPassword != "" {
		if !user.VerifyPassword(params.Body.CurPassword) {
			// Sleep a while to discourage brute-force attacks
			time.Sleep(util.WrongAuthDelayMax)
			return respBadRequest(exmodels.ErrorWrongCurPassword)
		}
		user.WithPassword(string(params.Body.NewPassword))
	}

	// Update the user
	user.
		WithName(data.TrimmedString(params.Body.Name)).
		WithWebsiteURL(string(params.Body.WebsiteURL))
	if err := svc.TheUserService.Update(user); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewCurUserUpdateNoContent()
}
