// Events used to interact with plugins.
// WARNING: unstable API

package plugin

import "gitlab.com/comentario/comentario/extend/intf"

// UserPayload is implemented by events carrying a user
type UserPayload interface {
	// User payload
	User() *intf.User
	// SetUser updates the user payload
	SetUser(*intf.User)
}

// ActivateEvent signals the plugin Comentario has readied all resources and is about to start serving the API.
// The plugin may want to start background processes that make use of resources such as database.
type ActivateEvent struct{}

// ShutdownEvent notifies the plugin it has to shut down, by e.g. freeing up resources, closing files etc. Fired when
// the server is about to shut down
type ShutdownEvent struct{}

// UserEvent is an event related to user, which implements UserPayload
type UserEvent struct {
	user *intf.User
}

func (e *UserEvent) User() *intf.User {
	return e.user
}

func (e *UserEvent) SetUser(u *intf.User) {
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
