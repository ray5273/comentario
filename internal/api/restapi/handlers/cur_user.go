package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_auth"
	"gitlab.com/comentario/comentario/internal/config"
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
	return api_auth.NewCurUserGetOK().WithPayload(user.ToAPIModel())
}

func CurUserProfileUpdate(params api_auth.CurUserProfileUpdateParams, principal data.Principal) middleware.Responder {
	// If the password is getting changed, verify the current password
	if params.Body.NewPassword != "" {
		// Fetch the user with its password hash (which doesn't get filled for principal during authentication)
		if u, err := svc.TheUserService.FindOwnerByID(principal.GetHexID(), true); err != nil {
			return respServiceError(err)

			// Verify the current password
		} else if !u.VerifyPassword(params.Body.CurPassword) {
			// Sleep a while to discourage brute-force attacks
			time.Sleep(util.WrongAuthDelayMax)
			return respBadRequest(ErrorWrongCurPassword)
		}
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
	// Find the owner user with that email
	var principal data.Principal
	if owner, err := svc.TheUserService.FindOwnerByEmail(data.EmailToString(params.Body.Email), false); err == nil {
		principal = &owner.User
	} else if err != svc.ErrNotFound {
		return respServiceError(err)
	}

	// If no user found, apply a random delay to discourage email polling
	if principal == nil {
		util.RandomSleep(util.WrongAuthDelayMin, util.WrongAuthDelayMax)

		// Send a reset email otherwise
	} else if r := sendPasswordResetToken(principal); r != nil {
		return r
	}

	// Succeeded (or no user found)
	return api_auth.NewCurUserPwdResetSendEmailNoContent()
}

// sendPasswordResetToken sends an email containing a password reset link to the given principal
func sendPasswordResetToken(principal data.Principal) middleware.Responder {
	// Determine the "entity"
	_, isCommenter := principal.(*data.UserCommenter)

	// Generate a random reset token
	if token, err := svc.TheUserService.CreateResetToken(principal.GetHexID(), isCommenter); err != nil {
		return respServiceError(err)

		// Send out an email
	} else if err := svc.TheMailService.SendFromTemplate(
		"",
		principal.GetUser().Email,
		"Reset your password",
		"reset-password.gohtml",
		map[string]any{"URL": config.URLForUI("en", "", map[string]string{"passwordResetToken": string(token)})},
	); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return nil
}
