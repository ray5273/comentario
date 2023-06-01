package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_auth"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"time"
)

func CurUserGet(params api_auth.CurUserGetParams) middleware.Responder {
	// Try to authenticate the user
	user, err := GetUserBySessionCookie(params.HTTPRequest)
	if err == svc.ErrDB {
		// Houston, we have a problem
		return respInternalError(nil)
	} else if err != nil {
		// Authentication failed for whatever reason
		return api_auth.NewCurUserGetNoContent()
	}

	// Succeeded: owner's logged in
	return api_auth.NewCurUserGetOK().WithPayload(user.ToPrincipal(nil))
}

func CurUserUpdate(params api_auth.CurUserUpdateParams, user *data.User) middleware.Responder {
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
	return api_auth.NewCurUserUpdateNoContent()
}
