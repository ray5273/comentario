// Events used to interact with plugins.
// WARNING: unstable API

package plugin

// UserPayload is implemented by events carrying a user
type UserPayload interface {
	// User payload
	User() *User
	// SetUser updates the user payload
	SetUser(*User)
}

// UserEvent is an event related to user, which implements UserPayload
type UserEvent struct {
	user *User
}

func (e *UserEvent) User() *User {
	return e.user
}

func (e *UserEvent) SetUser(u *User) {
	e.user = u
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

// UserBecomesOwnerEvent is fired when a user is about to become an owner of a domain, that is, receives the Owner role
// (e.g., registers a new domain)
type UserBecomesOwnerEvent struct {
	UserUpdateEvent
	CountOwnedDomains int // Number of domains the user already owns
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
