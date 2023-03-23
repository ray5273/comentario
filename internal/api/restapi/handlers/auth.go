package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_auth"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"golang.org/x/crypto/bcrypt"
	"net/http"
	"time"
)

func AuthLogin(params api_auth.AuthLoginParams) middleware.Responder {
	// Find the user
	user, err := svc.TheUserService.FindOwnerByEmail(data.EmailToString(params.Body.Email), true)
	if err == svc.ErrNotFound {
		time.Sleep(util.WrongAuthDelay)
		return respUnauthorized(util.ErrorInvalidEmailPassword)
	} else if err != nil {
		return respServiceError(err)
	}

	// Verify the owner is confirmed
	if !user.EmailConfirmed {
		return respUnauthorized(util.ErrorUnconfirmedEmail)
	}

	// Verify the provided password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(swag.StringValue(params.Body.Password))); err != nil {
		time.Sleep(util.WrongAuthDelay)
		return respUnauthorized(util.ErrorInvalidEmailPassword)
	}

	// Create a new owner session
	ownerToken, err := svc.TheUserService.CreateOwnerSession(user.HexID)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded. Return a principal and a session cookie
	return NewCookieResponder(api_auth.NewAuthLoginOK().WithPayload(user.ToAPIModel())).
		WithCookie(
			util.CookieNameUserSession,
			string(user.HexID+ownerToken),
			"/",
			util.UserSessionCookieDuration,
			true,
			http.SameSiteLaxMode)
}
