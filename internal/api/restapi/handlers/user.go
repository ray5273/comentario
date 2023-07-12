package handlers

import (
	"bytes"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"io"
)

func UserList(params api_general.UserListParams, user *data.User) middleware.Responder {
	// Extract domain ID, if any
	var domainID *uuid.UUID
	if params.Domain != nil {
		var err error
		if domainID, err = data.DecodeUUID(*params.Domain); err != nil {
			return respBadRequest(ErrorInvalidUUID)
		}
	}

	// Fetch pages the user has access to
	us, err := svc.TheUserService.List(
		&user.ID,
		domainID,
		user.IsSuperuser,
		swag.StringValue(params.Filter),
		swag.StringValue(params.SortBy),
		data.SortDirection(swag.BoolValue(params.SortDesc)),
		int(swag.Uint64Value(params.Page)-1))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewUserListOK().WithPayload(&api_general.UserListOKBody{Users: us})
}

func UserAvatarGet(params api_general.UserAvatarGetParams) middleware.Responder {
	// Parse the UUID
	if id, err := uuid.Parse(string(params.UUID)); err != nil {
		return respBadRequest(ErrorInvalidUUID)

		// Find the user by their ID
	} else if user, err := svc.TheUserService.FindUserByID(&id); err != nil {
		return respServiceError(err)

	} else if len(user.Avatar) == 0 {
		// No avatar
		return api_general.NewUserAvatarGetNoContent()

	} else {
		// Avatar is present
		return api_general.NewUserAvatarGetOK().WithPayload(io.NopCloser(bytes.NewReader(user.Avatar)))
	}
}
