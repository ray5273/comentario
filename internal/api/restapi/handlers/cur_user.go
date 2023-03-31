package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_auth"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
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

func CurUserPwdResetSendEmail(params api_auth.CurUserPwdResetSendEmailParams) middleware.Responder {
	email := data.EmailToString(params.Body.Email)
	// TODO entity := *params.Body.Entity
	entity := models.EntityOwner

	var user *data.User

	switch entity {
	// Resetting owner password
	case models.EntityOwner:
		if owner, err := svc.TheUserService.FindOwnerByEmail(email, false); err == nil {
			user = &owner.User
		} else if err != svc.ErrNotFound {
			return respServiceError(err)
		}

	// Resetting commenter password: find the locally authenticated commenter
	case models.EntityCommenter:
		if commenter, err := svc.TheUserService.FindCommenterByIdPEmail("", email, false); err == nil {
			user = &commenter.User
		} else if err != svc.ErrNotFound {
			return respServiceError(err)
		}
	}

	// If no user found, apply a random delay to discourage email polling
	if user == nil {
		util.RandomSleep(util.WrongAuthDelayMin, util.WrongAuthDelayMax)

		// Generate a random reset token
	} else if token, err := svc.TheUserService.CreateResetToken(user.HexID, entity); err != nil {
		return respServiceError(err)

		// Send out an email
	} else if err := svc.TheMailService.SendFromTemplate(
		"",
		email,
		"Reset your password",
		"reset-password.gohtml",
		map[string]any{"URL": config.URLForUI("en", "", map[string]string{"passwordResetToken": string(token)})},
	); err != nil {
		return respServiceError(err)
	}

	// Succeeded (or no user found)
	return api_auth.NewCurUserPwdResetSendEmailNoContent()
}

func CurUserPwdResetChange(params api_auth.CurUserPwdResetChangeParams) middleware.Responder {
	if _, err := svc.TheUserService.ResetUserPasswordByToken(*params.Body.Token, *params.Body.Password); err == svc.ErrBadToken {
		// Token unknown: forbidden
		return respForbidden(ErrorBadToken)
	} else if err != nil {
		// Any other error
		return respServiceError(err)
	}

	// Succeeded
	return api_auth.NewCurUserPwdResetChangeNoContent()
}
