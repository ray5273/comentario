package handlers

import (
	"crypto/hmac"
	"encoding/hex"
	"errors"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
)

func CurUserEmailUpdateConfirm(params api_general.CurUserEmailUpdateConfirmParams, user *data.User) middleware.Responder {
	// Verify email change is (still) possible
	newEmail := data.EmailToString(params.Email)
	if r := Verifier.UserCanChangeEmailTo(user, newEmail); r != nil {
		return r
	}

	// Parse the HMAC
	sig, err := hex.DecodeString(params.Hmac)
	if err != nil {
		return respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails("hmac"))
	}

	// Verify the signature
	if !hmac.Equal(sig, signUserEmailUpdate(user, newEmail)) {
		return respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails("HMAC signature doesn't check out"))
	}

	// Update the user, if the email is changing
	if newEmail != user.Email {
		if err := svc.TheUserService.Update(user.WithEmail(newEmail)); err != nil {
			return respServiceError(err)
		}
	}

	// Succeeded, redirect the user to the profile
	return api_general.NewCurUserEmailUpdateConfirmTemporaryRedirect().
		WithLocation(svc.TheI18nService.FrontendURL(user.LangID, "manage/account/profile", nil))
}

func CurUserEmailUpdateRequest(params api_general.CurUserEmailUpdateRequestParams, user *data.User) middleware.Responder {
	// Verify the provided password
	if r := Verifier.UserCurrentPassword(user, swag.StringValue(params.Body.Password)); r != nil {
		return r
	}

	// Verify email change is possible
	newEmail := data.EmailPtrToString(params.Body.Email)
	if r := Verifier.UserCanChangeEmailTo(user, newEmail); r != nil {
		return r
	}

	// Check the email is changing
	confirmation := false
	if newEmail != user.Email {
		// Verify email change is enabled
		if !svc.TheDynConfigService.GetBool(data.ConfigKeyAuthEmailUpdateEnabled) {
			return respForbidden(exmodels.ErrorEmailUpdateForbidden)
		}

		// If there's no configured mailer, update the email right away
		if !util.TheMailer.Operational() {
			if err := svc.TheUserService.Update(user.WithEmail(newEmail)); err != nil {
				return respServiceError(err)
			}

		} else {
			// Send out an email update confirmation email otherwise
			confirmation = true
			if r := sendEmailUpdateConfirmation(user, newEmail); r != nil {
				return r
			}
		}
	}

	// Succeeded
	return api_general.NewCurUserEmailUpdateRequestOK().
		WithPayload(&api_general.CurUserEmailUpdateRequestOKBody{ConfirmationExpected: confirmation})
}

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
		if r := Verifier.UserCurrentPassword(user, params.Body.CurPassword); r != nil {
			return r
		}
		user.WithPassword(string(params.Body.NewPassword))
	}

	// Update the user
	user.
		WithLangID(params.Body.LangID).
		WithName(data.TrimmedString(params.Body.Name)).
		WithWebsiteURL(string(params.Body.WebsiteURL))
	if err := svc.TheUserService.Update(user); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewCurUserUpdateNoContent()
}

// signUserEmailUpdate signs the given user's email update using HMAC with SHA256
func signUserEmailUpdate(u *data.User, newEmail string) []byte {
	// Sign the new email with the client secret combined with the server's XSRF key
	return util.HMACSign([]byte(newEmail), append(u.SecretToken[:], config.SecretsConfig.XSRFKey()...))
}
