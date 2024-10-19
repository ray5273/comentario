// Events used to interact with plugins.
// WARNING: unstable API

package plugin

// UserPayload is implemented by events carrying a user
type UserPayload interface {
	// User payload
	User() *User
	// SetUser updates the user payload
	SetUser(*User)
	// UserAttributes provides attributes of the user
	UserAttributes() map[string]string
	// SetUserAttributes updates the user's attributes
	SetUserAttributes(map[string]string)
}

// UserEvent is an event related to user, which implements UserPayload
type UserEvent struct {
	user      *User
	userAttrs map[string]string
}

func (e *UserEvent) User() *User {
	return e.user
}

func (e *UserEvent) SetUser(u *User) {
	e.user = u
}

func (e *UserEvent) UserAttributes() map[string]string {
	return e.userAttrs
}

func (e *UserEvent) SetUserAttributes(a map[string]string) {
	e.userAttrs = a
}

// ---------------------------------------------------------------------------------------------------------------------

// UserCreateEvent is fired on user creation
type UserCreateEvent struct {
	UserEvent
}

// UserUpdateEvent is fired on updating a user
type UserUpdateEvent struct {
	UserEvent
}

// UserDeleteEvent is fired on user deletion
type UserDeleteEvent struct {
	UserEvent
}

// UserBanStatusEvent is fired when a user gets banned or unbanned
type UserBanStatusEvent struct {
	UserUpdateEvent
}

// UserConfirmedEvent is fired when a user confirms their email
type UserConfirmedEvent struct {
	UserUpdateEvent
}

// UserLoginLockedStatusEvent is fired when a user's LastLogin or Locked status gets changed
type UserLoginLockedStatusEvent struct {
	UserUpdateEvent
}

// UserMadeSuperuserEvent is fired when a user is made a superuser using a command-line option (or equivalent)
type UserMadeSuperuserEvent struct {
	UserUpdateEvent
}
