package exmodels

import (
	"errors"
)

// Error is a standard model for errors returned by "generic" error responders
type Error struct {
	ID      string `json:"id"`
	Message string `json:"message,omitempty"`
	Details string `json:"details,omitempty"`
}

// Error converts this error into an error instance
func (e *Error) Error() error {
	return errors.New(e.String())
}

// String returns a user-friendly error description
func (e *Error) String() string {
	s := e.Message
	if e.Details != "" {
		s += " (" + e.Details + ")"
	}
	return s
}

// WithDetails returns a copy of the error with added details
func (e *Error) WithDetails(details string) *Error {
	return &Error{
		ID:      e.ID,
		Message: e.Message,
		Details: details,
	}
}

var (
	ErrorUnknown = &Error{Message: "Internal server error"}

	ErrorBadToken              = &Error{ID: "bad-token", Message: "Token is missing or invalid"}
	ErrorCommentTextTooLong    = &Error{ID: "comment-text-too-long", Message: "Comment text is too long"}
	ErrorDeletingLastSuperuser = &Error{ID: "deleting-last-superuser", Message: "Can't delete the last superuser in the system"}
	ErrorDeletingLastOwner     = &Error{ID: "deleting-last-owner", Message: "Can't delete the last owner in domain(s)"}
	ErrorDomainReadonly        = &Error{ID: "domain-readonly", Message: "This domain is read-only"}
	ErrorEmailAlreadyExists    = &Error{ID: "email-already-exists", Message: "This email address is already registered"}
	ErrorEmailUpdateForbidden  = &Error{ID: "email-update-forbidden", Message: "You're not allowed to change email"}
	ErrorEmailNotConfirmed     = &Error{ID: "email-not-confirmed", Message: "User's email address is not confirmed yet"}
	ErrorEmailSendFailure      = &Error{ID: "email-send-failure", Message: "Failed to send email"}
	ErrorFeatureDisabled       = &Error{ID: "feature-disabled", Message: "This feature is disabled"}
	ErrorHostAlreadyExists     = &Error{ID: "host-already-exists", Message: "This host is already registered"}
	ErrorIdPUnconfigured       = &Error{ID: "idp-unconfigured", Message: "Identity provider isn't configured"}
	ErrorIdPUnknown            = &Error{ID: "idp-unknown", Message: "Unknown identity provider"}
	ErrorImmutableAccount      = &Error{ID: "immutable-account", Message: "Account cannot be updated"}
	ErrorImmutableProperty     = &Error{ID: "immutable-property", Message: "Property cannot be updated"}
	ErrorInvalidCredentials    = &Error{ID: "invalid-credentials", Message: "Wrong password or user doesn't exist"}
	ErrorInvalidInputData      = &Error{ID: "invalid-input-data", Message: "Invalid input data provided"}
	ErrorInvalidPropertyValue  = &Error{ID: "invalid-prop-value", Message: "Value of the property is invalid"}
	ErrorInvalidUUID           = &Error{ID: "invalid-uuid", Message: "Invalid UUID value"}
	ErrorLoginLocally          = &Error{ID: "login-locally", Message: "There's already a registered account with this email. Please login with your email and password instead"}
	ErrorLoginUsingIdP         = &Error{ID: "login-using-idp", Message: "There's already a registered account with this email. Please login via the correct federated identity provider instead"}
	ErrorLoginUsingSSO         = &Error{ID: "login-using-sso", Message: "There's already a registered account with this email. Please login via SSO"}
	ErrorNewOwnersForbidden    = &Error{ID: "new-owners-forbidden", Message: "New owner users are forbidden"}
	ErrorNoLocalUser           = &Error{ID: "no-local-user", Message: "User is not locally authenticated"}
	ErrorNoRootComment         = &Error{ID: "no-root-comment", Message: "Comment is not a root comment"}
	ErrorNoSuperuser           = &Error{ID: "no-superuser", Message: "User is not a superuser"}
	ErrorNotAllowed            = &Error{ID: "not-allowed", Message: "This action is forbidden"}
	ErrorNotDomainOwner        = &Error{ID: "not-domain-owner", Message: "User is not a domain owner"}
	ErrorNotModerator          = &Error{ID: "not-moderator", Message: "User is not a moderator"}
	ErrorPagePathAlreadyExists = &Error{ID: "page-path-already-exists", Message: "This page path is already used by another page"}
	ErrorPageReadonly          = &Error{ID: "page-readonly", Message: "This page is read-only"}
	ErrorResourceFetchFailed   = &Error{ID: "resource-fetch-failed", Message: "Failed to fetch external resource"}
	ErrorSelfOperation         = &Error{ID: "self-operation", Message: "You cannot do this to yourself"}
	ErrorSelfVote              = &Error{ID: "self-vote", Message: "You cannot vote for your own comment"}
	ErrorSignupsForbidden      = &Error{ID: "signups-forbidden", Message: "New signups are forbidden"}
	ErrorSSOMisconfigured      = &Error{ID: "sso-misconfigured", Message: "Domain's SSO configuration is invalid"}
	ErrorUnauthenticated       = &Error{ID: "unauthenticated", Message: "User isn't authenticated"}
	ErrorUnauthorized          = &Error{ID: "unauthorized", Message: "You are not allowed to perform this operation"}
	ErrorUnknownHost           = &Error{ID: "unknown-host", Message: "Unknown host"}
	ErrorUserBanned            = &Error{ID: "user-banned", Message: "User is banned"}
	ErrorUserLocked            = &Error{ID: "user-locked", Message: "User is locked"}
	ErrorUserReadonly          = &Error{ID: "user-readonly", Message: "This user is read-only on this domain"}
	ErrorWrongCurPassword      = &Error{ID: "wrong-cur-password", Message: "Wrong current password"}
	ErrorXSRFTokenInvalid      = &Error{ID: "xsrf-token-invalid", Message: "XSRF token is missing or invalid"}
)
