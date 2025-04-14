package handlers

import (
	"bytes"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/persistence"
	"gitlab.com/comentario/comentario/internal/svc"
	"io"
	"strings"
)

func UserAvatarGet(params api_general.UserAvatarGetParams) middleware.Responder {
	// Parse the UUID
	if id, r := parseUUID(params.UUID); r != nil {
		return r

		// Find the user avatar by their ID. No transaction required as it's an atomic operation
	} else if ua, err := svc.Services.AvatarService(nil).GetByUserID(id); err != nil {
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

func UserBan(params api_general.UserBanParams, user *data.User) middleware.Responder {
	// Verify the user is a superuser
	if r := Verifier.UserIsSuperuser(user); r != nil {
		return r
	}

	// Fetch the user
	u, r := userGet(params.UUID)
	if r != nil {
		return r
	}

	// Verify the user being banned is not a system account
	if r := Verifier.UserIsNotSystem(u); r != nil {
		return r
	}

	// Make sure the user isn't banning themselves
	if r := Verifier.IsAnotherUser(&user.ID, &u.ID); r != nil {
		return r
	}

	// Update the user if necessary
	ban := swag.BoolValue(params.Body.Ban)
	var cntDel int64
	err := svc.Services.WithTx(func(tx *persistence.DatabaseTx) error {
		if u.Banned != ban {
			if err := svc.Services.UserService(tx).UpdateBanned(&user.ID, u, ban); err != nil {
				return err
			}
		}

		// When banning the user, all user's comments can also be deleted or purged
		if ban && params.Body.DeleteComments {
			var err error
			if params.Body.PurgeComments {
				if cntDel, err = svc.Services.CommentService(tx).DeleteByUser(&u.ID); err != nil {
					return err
				}
			} else if cntDel, err = svc.Services.CommentService(tx).MarkDeletedByUser(&user.ID, &u.ID); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewUserBanOK().WithPayload(&api_general.UserBanOKBody{CountDeletedComments: cntDel})
}

func UserDelete(params api_general.UserDeleteParams, user *data.User) middleware.Responder {
	// Verify the user is a superuser
	if r := Verifier.UserIsSuperuser(user); r != nil {
		return r
	}

	// Fetch the user
	u, r := userGet(params.UUID)
	if r != nil {
		return r
	}

	// Verify the user being deleted is not a system account
	if r := Verifier.UserIsNotSystem(u); r != nil {
		return r
	}

	// Make sure the user isn't deleting themselves
	if r := Verifier.IsAnotherUser(&user.ID, &u.ID); r != nil {
		return r
	}

	// Delete the user, optionally deleting their comments
	var cntDel int64
	err := svc.Services.WithTx(func(tx *persistence.DatabaseTx) error {
		var err error
		cntDel, err = svc.Services.UserService(tx).DeleteUserByID(u, params.Body.DeleteComments, params.Body.PurgeComments)
		return err
	})
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewUserDeleteOK().WithPayload(&api_general.UserDeleteOKBody{CountDeletedComments: cntDel})
}

func UserGet(params api_general.UserGetParams, user *data.User) middleware.Responder {
	// Verify the user is a superuser
	if r := Verifier.UserIsSuperuser(user); r != nil {
		return r
	}

	// Fetch the user
	u, r := userGet(params.UUID)
	if r != nil {
		return r
	}

	// Fetch user attributes
	attr, err := svc.Services.UserAttrService(nil).GetAll(&u.ID)
	if err != nil {
		return respServiceError(err)
	}

	// Fetch domains the current user has access to, and the corresponding domain users in relation to the user in
	// question
	ds, dus, err := svc.Services.DomainService(nil).ListByDomainUser(&u.ID, &user.ID, user.IsSuperuser, true, "", "", data.SortAsc, -1)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewUserGetOK().
		WithPayload(&api_general.UserGetOKBody{
			Attributes:  attr,
			DomainUsers: data.SliceToDTOs(dus),
			Domains:     data.SliceToDTOs(ds),
			User:        u.ToDTO(),
		})
}

func UserList(params api_general.UserListParams, user *data.User) middleware.Responder {
	// Verify the user is a superuser
	if r := Verifier.UserIsSuperuser(user); r != nil {
		return r
	}

	// Fetch pages the user has access to
	us, err := svc.Services.UserService(nil).List(
		swag.StringValue(params.Filter),
		swag.StringValue(params.SortBy),
		data.SortDirection(swag.BoolValue(params.SortDesc)),
		data.PageIndex(params.Page))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewUserListOK().
		WithPayload(&api_general.UserListOKBody{Users: data.SliceToDTOs(us)})
}

func UserSessionList(params api_general.UserSessionListParams, user *data.User) middleware.Responder {
	// Verify the user is a superuser
	if r := Verifier.UserIsSuperuser(user); r != nil {
		return r
	}

	// Extract user ID
	userID, r := parseUUID(params.UUID)
	if r != nil {
		return r
	}

	// Fetch user sessions
	uss, err := svc.Services.UserService(nil).ListUserSessions(userID, data.PageIndex(params.Page))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewUserSessionListOK().WithPayload(data.SliceToDTOs(uss))
}

func UserSessionsExpire(params api_general.UserSessionsExpireParams, user *data.User) middleware.Responder {
	// Verify the user is a superuser
	if r := Verifier.UserIsSuperuser(user); r != nil {
		return r
	}

	// Extract user ID
	userID, r := parseUUID(params.UUID)
	if r != nil {
		return r
	}

	// Expire user sessions
	err := svc.Services.WithTx(func(tx *persistence.DatabaseTx) error {
		return svc.Services.UserService(tx).ExpireUserSessions(userID)
	})
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewUserSessionsExpireNoContent()
}

func UserUnlock(params api_general.UserUnlockParams, user *data.User) middleware.Responder {
	// Verify the user is a superuser
	if r := Verifier.UserIsSuperuser(user); r != nil {
		return r
	}

	// Fetch the user
	u, r := userGet(params.UUID)
	if r != nil {
		return r
	}

	// Don't bother if the user isn't locked
	if u.IsLocked {
		// Update the user
		if err := svc.Services.UserService(nil).UpdateLoginLocked(u.WithLocked(false)); err != nil {
			return respServiceError(err)
		}
	}

	// Succeeded
	return api_general.NewUserUnlockNoContent()
}

func UserUpdate(params api_general.UserUpdateParams, user *data.User) middleware.Responder {
	// Verify the user is a superuser
	if r := Verifier.UserIsSuperuser(user); r != nil {
		return r
	}

	// Fetch the user
	u, r := userGet(params.UUID)
	if r != nil {
		return r
	}

	// Verify the user being updated is not a system account
	if r := Verifier.UserIsNotSystem(u); r != nil {
		return r
	}

	// Email, name, password, website can only be updated for a local user (email and name are mandatory)
	dto := params.Body.User
	email := data.EmailToString(dto.Email)
	name := strings.TrimSpace(dto.Name)
	password := dto.Password
	website := data.URIToString(dto.WebsiteURL)
	if u.IsLocal() {
		// Validate the email change
		if r := Verifier.UserCanChangeEmailTo(u, email); r != nil {
			return r
		}

		// Validate the name
		if name == "" {
			return respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails("name"))
		}
		u.
			WithEmail(email).
			WithName(name).
			WithWebsiteURL(website)

		// Update password only if it's provided
		if password != "" {
			u.WithPassword(string(password))
		}

		// Federated user
	} else if email != "" {
		return respBadRequest(exmodels.ErrorImmutableProperty.WithDetails("email"))
	} else if name != "" {
		return respBadRequest(exmodels.ErrorImmutableProperty.WithDetails("name"))
	} else if password != "" {
		return respBadRequest(exmodels.ErrorImmutableProperty.WithDetails("password"))
	} else if website != "" {
		return respBadRequest(exmodels.ErrorImmutableProperty.WithDetails("websiteUrl"))
	}

	// A user cannot revoke their own superuser or confirmed status
	if user.ID == u.ID {
		if !dto.IsSuperuser {
			return respBadRequest(exmodels.ErrorSelfOperation.WithDetails("revoke superuser"))
		} else if !dto.Confirmed {
			return respBadRequest(exmodels.ErrorSelfOperation.WithDetails("remove confirmed status"))
		}
	}

	// Update user properties
	u.WithConfirmed(dto.Confirmed).
		WithRemarks(strings.TrimSpace(dto.Remarks)).
		WithSuperuser(dto.IsSuperuser).
		WithLangID(swag.StringValue(dto.LangID))

	// Persist the user
	if err := svc.Services.UserService(nil).Update(u); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewUserUpdateOK().WithPayload(&api_general.UserUpdateOKBody{User: u.ToDTO()})
}

// userGet parses a string UUID and fetches the corresponding user
func userGet(id strfmt.UUID) (*data.User, middleware.Responder) {
	// Extract user ID
	userID, r := parseUUID(id)
	if r != nil {
		return nil, r
	}

	// Fetch the user
	user, err := svc.Services.UserService(nil).FindUserByID(userID)
	if err != nil {
		return nil, respServiceError(err)
	}

	// Succeeded
	return user, nil
}

// userGetOptional parses a pointer to string UUID and fetches the corresponding user, or nil if the pointer was nil
func userGetOptional(pid *strfmt.UUID) (*data.User, middleware.Responder) {
	// Return nil if nil input is provided
	if pid == nil {
		return nil, nil
	}

	// Parse the ID and fetch the user otherwise
	return userGet(*pid)
}
