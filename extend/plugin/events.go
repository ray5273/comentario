// Events used to interact with plugins.
// WARNING: unstable API

package plugin

// HandleEventResult is a result of handling an event
type HandleEventResult struct {
	// Handled, when true, indicates the event has been successfully handled and is not subject to further processing
	Handled bool
}

// IsHandled returns whether this result indicates successful handling of an event
func (r *HandleEventResult) IsHandled() bool {
	return r != nil && r.Handled
}

// ---------------------------------------------------------------------------------------------------------------------

// UserEvent is an event related to user
type UserEvent struct {
	// User in question
	User *User
}

// UserCreateBeforeEvent represents an event fired before user creation
type UserCreateBeforeEvent struct {
	UserEvent
}

// UserCreateAfterEvent represents an event fired after user creation
type UserCreateAfterEvent struct {
	UserEvent
}

// UserDeleteBeforeEvent represents an event fired before user deletion
type UserDeleteBeforeEvent struct {
	UserEvent
}

// UserDeleteAfterEvent represents an event fired after user deletion
type UserDeleteAfterEvent struct {
	UserEvent
}
