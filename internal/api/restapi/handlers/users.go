package handlers

import (
	"bytes"
	"github.com/go-openapi/runtime/middleware"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/svc"
	"io"
)

func UsersAvatarGet(params api_general.UsersAvatarGetParams) middleware.Responder {
	// Parse the UUID
	if id, err := uuid.Parse(string(params.UUID)); err != nil {
		return respBadRequest(ErrorInvalidUUID)

		// Find the user by their ID
	} else if user, err := svc.TheUserService.FindUserByID(&id); err != nil {
		return respServiceError(err)

	} else if len(user.Avatar) == 0 {
		// No avatar
		return api_general.NewUsersAvatarGetNoContent()

	} else {
		// Avatar is present
		return api_general.NewUsersAvatarGetOK().WithPayload(io.NopCloser(bytes.NewReader(user.Avatar)))
	}
}
