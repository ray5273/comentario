package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"time"
)

func CurUserGet(params api_general.CurUserGetParams) middleware.Responder {
	// Try to authenticate the user
	user, err := GetUserBySessionCookie(params.HTTPRequest)
	if err == svc.ErrDB {
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
		defer params.Data.Close()
	}

	// Update the user's avatar
	if err := svc.TheUserService.UpdateAvatar(&user.ID, params.Data); err != nil {
		return respServiceError(err)
	}

	// Succeeded: owner's logged in
	return api_general.NewCurUserSetAvatarNoContent()
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
			return respBadRequest(ErrorWrongCurPassword)
		}
		user.WithPassword(params.Body.NewPassword)
	}

	// Update the user
	if err := svc.TheUserService.Update(user.WithName(data.TrimmedString(params.Body.Name))); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewCurUserUpdateNoContent()
}
