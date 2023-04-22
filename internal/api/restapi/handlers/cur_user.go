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
	user, err := GetUserFromSessionCookie(params.HTTPRequest)
	if err == svc.ErrDB {
		// Houston, we have a problem
		return respInternalError(nil)
	} else if err != nil {
		// Authentication failed for whatever reason
		return api_auth.NewCurUserGetNoContent()
	}

	// Succeeded: owner's logged in
	return api_auth.NewCurUserGetOK().WithPayload(user.ToPrincipal())
}

func CurUserProfileUpdate(params api_auth.CurUserProfileUpdateParams, user *data.User) middleware.Responder {
	// If the password is getting changed, verify the current password
	if params.Body.NewPassword != "" && !user.VerifyPassword(params.Body.CurPassword) {
		// Sleep a while to discourage brute-force attacks
		time.Sleep(util.WrongAuthDelayMax)
		return respBadRequest(ErrorWrongCurPassword)
	}

	// Update the user
	if err := svc.TheUserService.UpdateOwner(principal.GetHexID(), data.TrimmedString(params.Body.Name), params.Body.NewPassword); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_auth.NewCurUserProfileUpdateNoContent()
}

func CurUserPwdResetChange(params api_auth.CurUserPwdResetChangeParams) middleware.Responder {
	if err := svc.TheUserService.ResetUserPasswordByToken(*params.Body.Token, *params.Body.Password); err == svc.ErrBadToken {
		// Token unknown: forbidden
		return respForbidden(ErrorBadToken)
	} else if err != nil {
		// Any other error
		return respServiceError(err)
	}

	// Succeeded
	return api_auth.NewCurUserPwdResetChangeNoContent()
}

func CurUserPwdResetSendEmail(params api_auth.CurUserPwdResetSendEmailParams) middleware.Responder {
	if r := sendPasswordResetEmail(data.EmailToString(params.Body.Email)); r != nil {
		return r
	}

	// Succeeded
	return api_auth.NewCurUserPwdResetSendEmailNoContent()
}
