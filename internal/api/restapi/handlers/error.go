package handlers

import "gitlab.com/comentario/comentario/internal/api/exmodels"

var (
	ErrorBadToken              = &exmodels.Error{ID: "bad-token", Message: "Token is missing or invalid"}
	ErrorDeletingLastSuperuser = &exmodels.Error{ID: "deleting-last-superuser", Message: "Can't delete the last superuser in the system"}
	ErrorDeletingLastOwner     = &exmodels.Error{ID: "deleting-last-owner", Message: "Can't delete the last owner in domain(s)"}
	ErrorDomainReadonly        = &exmodels.Error{ID: "domain-readonly", Message: "This domain is read-only"}
	ErrorEmailAlreadyExists    = &exmodels.Error{ID: "email-already-exists", Message: "This email address is already registered"}
	ErrorEmailNotConfirmed     = &exmodels.Error{ID: "email-not-confirmed", Message: "User's email address is not confirmed yet"}
	ErrorEmailSendFailure      = &exmodels.Error{ID: "email-send-failure", Message: "Failed to send email"}
	ErrorHostAlreadyExists     = &exmodels.Error{ID: "host-already-exists", Message: "This host is already registered"}
	ErrorIdPUnconfigured       = &exmodels.Error{ID: "idp-unconfigured", Message: "Identity provider isn't configured"}
	ErrorIdPUnknown            = &exmodels.Error{ID: "idp-unknown", Message: "Unknown identity provider"}
	ErrorImmutableProperty     = &exmodels.Error{ID: "immutable-property", Message: "Property cannot be updated"}
	ErrorInvalidCredentials    = &exmodels.Error{ID: "invalid-credentials", Message: "Wrong password or user doesn't exist"}
	ErrorInvalidPropertyValue  = &exmodels.Error{ID: "invalid-prop-value", Message: "Value of the property is invalid"}
	ErrorInvalidUUID           = &exmodels.Error{ID: "invalid-uuid", Message: "Invalid UUID value"}
	ErrorLoginLocally          = &exmodels.Error{ID: "login-locally", Message: "Login with your email and password instead"}
	ErrorLoginUsingIdP         = &exmodels.Error{ID: "login-using-idp", Message: "Login via federated identity provider"}
	ErrorLoginUsingSSO         = &exmodels.Error{ID: "login-using-sso", Message: "Login via SSO"}
	ErrorNewOwnersForbidden    = &exmodels.Error{ID: "new-owners-forbidden", Message: "New owner users are forbidden"}
	ErrorNoLocalUser           = &exmodels.Error{ID: "no-local-user", Message: "User is not locally authenticated"}
	ErrorNoRootComment         = &exmodels.Error{ID: "no-root-comment", Message: "Comment is not a root comment"}
	ErrorNoSuperuser           = &exmodels.Error{ID: "no-superuser", Message: "User is not a superuser"}
	ErrorNotDomainOwner        = &exmodels.Error{ID: "not-domain-owner", Message: "User is not a domain owner"}
	ErrorNotModerator          = &exmodels.Error{ID: "not-moderator", Message: "User is not a moderator"}
	ErrorPageReadonly          = &exmodels.Error{ID: "page-readonly", Message: "This page is read-only"}
	ErrorSelfOperation         = &exmodels.Error{ID: "self-operation", Message: "You cannot do this to yourself"}
	ErrorSelfVote              = &exmodels.Error{ID: "self-vote", Message: "You cannot vote for your own comment"}
	ErrorSignupsForbidden      = &exmodels.Error{ID: "signups-forbidden", Message: "New signups are forbidden"}
	ErrorSSOMisconfigured      = &exmodels.Error{ID: "sso-misconfigured", Message: "Domain's SSO configuration is invalid"}
	ErrorUnauthenticated       = &exmodels.Error{ID: "unauthenticated", Message: "User isn't authenticated"}
	ErrorUnauthorized          = &exmodels.Error{ID: "unauthorized", Message: "You are not allowed to perform this operation"}
	ErrorUnknownHost           = &exmodels.Error{ID: "unknown-host", Message: "Unknown host"}
	ErrorUserBanned            = &exmodels.Error{ID: "user-banned", Message: "User is banned"}
	ErrorUserReadonly          = &exmodels.Error{ID: "user-readonly", Message: "This user is read-only on this domain"}
	ErrorWrongCurPassword      = &exmodels.Error{ID: "wrong-cur-password", Message: "Wrong current password"}
)
