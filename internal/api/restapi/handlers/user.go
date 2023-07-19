package handlers

import (
	"bytes"
	"database/sql"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"io"
)

func UserGet(params api_general.UserGetParams, user *data.User) middleware.Responder {
	// Extract user ID
	userID, err := data.DecodeUUID(params.UUID)
	if err != nil {
		return respBadRequest(ErrorInvalidUUID.WithDetails(string(params.UUID)))
	}

	// Fetch the user
	u, err := svc.TheUserService.FindUserByID(userID)
	if err != nil {
		return respServiceError(err)
	}

	// Fetch user authorisations
	isOwner, isModerator, _, err := svc.TheUserService.GetMaxUserAuthorisations(&u.ID, &user.ID)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded: apply the current user's clearance
	return api_general.NewUserGetOK().
		WithPayload(&api_general.UserGetOKBody{
			User: u.
				WithClearance(user.IsSuperuser, isOwner, isModerator).
				ToDTO(sql.NullBool{}, sql.NullBool{}, sql.NullBool{}),
		})
}

func UserList(params api_general.UserListParams, user *data.User) middleware.Responder {
	// Extract domain ID, if any
	var domainID *uuid.UUID
	if params.Domain != nil {
		var err error
		if domainID, err = data.DecodeUUID(*params.Domain); err != nil {
			return respBadRequest(ErrorInvalidUUID.WithDetails(string(*params.Domain)))
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

		// Find the user avatar by their ID
	} else if ua, err := svc.TheAvatarService.GetByUserID(&id); err != nil {
		return respServiceError(err)

	} else if ua == nil {
		// No avatar
		return api_general.NewUserAvatarGetNoContent()

	} else {
		// Avatar is present. Fetch the desired size
		avatar := ua.Get(data.UserAvatarSizeFromStr(swag.StringValue(params.Size)))
		return api_general.NewUserAvatarGetOK().WithPayload(io.NopCloser(bytes.NewReader(avatar)))
	}
}
