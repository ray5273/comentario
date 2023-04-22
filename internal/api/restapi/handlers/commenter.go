package handlers

import (
	"bytes"
	"github.com/disintegration/imaging"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_commenter"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"image"
	"image/color"
	"image/draw"
	"io"
	"net/http"
)

func CommenterLogin(params api_commenter.CommenterLoginParams) middleware.Responder {
	// Log the user in
	user, session, r := loginLocalUser(
		data.EmailToString(params.Body.Email),
		swag.StringValue(params.Body.Password),
		string(params.Body.Host),
		params.HTTPRequest)
	if r != nil {
		return r
	}

	// Succeeded
	return api_commenter.NewCommenterLoginOK().WithPayload(&api_commenter.CommenterLoginOKBody{
		SessionToken: session.EncodeIDs(),
		Principal:    user.ToPrincipal(),
	})
}

func CommenterLogout(params api_commenter.CommenterLogoutParams, user *data.User) middleware.Responder {
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
	return api_commenter.NewCommenterLogoutNoContent()
}

func CommenterSignup(params api_commenter.CommenterSignupParams) middleware.Responder {
	// Verify no such email is registered yet
	email := data.EmailToString(params.Body.Email)
	if exists, err := svc.TheUserService.IsUserEmailKnown(email); err != nil {
		return respServiceError(err)
	} else if exists {
		return respBadRequest(ErrorEmailAlreadyExists)
	}

	// Create a new user
	user := data.NewUser(email, data.TrimmedString(params.Body.Name)).
		WithPassword(swag.StringValue(params.Body.Password)).
		WithSignup(params.HTTPRequest, data.URIToString(params.Body.URL)).
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
	return api_commenter.NewCommenterSignupOK().WithPayload(user.ToPrincipal())
}

func CommenterPhoto(params api_commenter.CommenterPhotoParams) middleware.Responder {
	// Validate the passed commenter hex ID
	id := models.HexID(params.ID)
	if err := id.Validate(nil); err != nil {
		return respBadRequest(ErrorInvalidPropertyValue.WithDetails("id"))
	}

	// Find the commenter user
	commenter, err := svc.TheUserService.FindCommenterByID(id)
	if err != nil {
		return respServiceError(err)
	}

	// Fetch the image pointed to by the PhotoURL
	resp, err := http.Get(commenter.PhotoURL)
	if err != nil {
		return respNotFound(nil)
	}
	defer resp.Body.Close()

	// Limit the size of the response to 512 KiB to prevent DoS attacks that exhaust memory
	limitedResp := &io.LimitedReader{R: resp.Body, N: 512 * 1024}

	// Decode the image
	img, imgFormat, err := image.Decode(limitedResp)
	if err != nil {
		return respInternalError(nil)
	}
	logger.Debugf("Loaded commenter avatar: format=%s, dimensions=%s", imgFormat, img.Bounds().Size().String())

	// If it's a PNG, flatten it against a white background
	if imgFormat == "png" {
		logger.Debug("Flattening PNG image")

		// Create a new white Image with the same dimension of PNG image
		bgImage := image.NewRGBA(img.Bounds())
		draw.Draw(bgImage, bgImage.Bounds(), &image.Uniform{C: color.White}, image.Point{}, draw.Src)

		// Paste the PNG image over the background
		draw.Draw(bgImage, bgImage.Bounds(), img, img.Bounds().Min, draw.Over)
		img = bgImage
	}

	// Resize the image and encode into a JPEG
	var buf bytes.Buffer
	if err = imaging.Encode(&buf, imaging.Resize(img, 38, 0, imaging.Lanczos), imaging.JPEG); err != nil {
		return respInternalError(nil)
	}
	return api_commenter.NewCommenterPhotoOK().WithPayload(io.NopCloser(&buf))
}

func CommenterPwdResetSendEmail(params api_commenter.CommenterPwdResetSendEmailParams) middleware.Responder {
	if r := sendPasswordResetEmail(data.EmailToString(params.Body.Email)); r != nil {
		return r
	}

	// Succeeded
	return api_commenter.NewCommenterPwdResetSendEmailNoContent()
}

func CommenterSelf(params api_commenter.CommenterSelfParams) middleware.Responder {
	// Extract a commenter token from the corresponding header, if any
	if token := models.HexID(params.HTTPRequest.Header.Get(util.HeaderCommenterToken)); token.Validate(nil) == nil {
		// Find the commenter
		if commenter, err := svc.TheUserService.FindCommenterByToken(token); err != nil && err != svc.ErrNotFound {
			// Any error except "not found"
			return respServiceError(err)

		} else if err == nil {
			// Fetch the commenter's email
			email, err := svc.TheEmailService.FindByEmail(commenter.Email)
			if err != nil {
				return respServiceError(err)
			}

			// Succeeded
			return api_commenter.NewCommenterSelfOK().WithPayload(&api_commenter.CommenterSelfOKBody{
				Commenter: commenter.ToCommenter(),
				Email:     email,
			})
		}
	}

	// Not logged in, bad token, commenter is anonymous or doesn't exist
	return api_commenter.NewCommenterSelfNoContent()
}

func CommenterTokenNew(api_commenter.CommenterTokenNewParams) middleware.Responder {
	// Create an "anonymous" session
	token, err := svc.TheUserService.CreateCommenterSession("")
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_commenter.NewCommenterTokenNewOK().WithPayload(&api_commenter.CommenterTokenNewOKBody{CommenterToken: token})
}

func CommenterUpdate(params api_commenter.CommenterUpdateParams, principal data.Principal) middleware.Responder {
	// Verify the commenter is authenticated
	if r := Verifier.PrincipalIsAuthenticated(principal); r != nil {
		return r
	}
	commenter := principal.(*data.UserCommenter)

	// Only locally authenticated users can be updated
	if commenter.Provider != "" {
		return respBadRequest(ErrorFederatedProfile)
	}

	// Update the commenter in the database
	err := svc.TheUserService.UpdateCommenter(
		commenter.HexID,
		commenter.Email,
		data.TrimmedString(params.Body.Name),
		string(params.Body.WebsiteURL),
		string(params.Body.AvatarURL),
		commenter.Provider)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_commenter.NewCommenterUpdateNoContent()
}
