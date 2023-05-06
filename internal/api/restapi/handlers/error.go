package handlers

import "gitlab.com/comentario/comentario/internal/api/exmodels"

var (
	ErrorBadToken             = &exmodels.Error{ID: "bad-token", Message: "Token is missing or invalid"}
	ErrorCommentDeleted       = &exmodels.Error{ID: "comment-deleted", Message: "This comment has been deleted"}
	ErrorDomainFrozen         = &exmodels.Error{ID: "domain-frozen", Message: "This domain is frozen"}
	ErrorEmailAlreadyExists   = &exmodels.Error{ID: "email-already-exists", Message: "This email address is already registered"}
	ErrorEmailNotConfirmed    = &exmodels.Error{ID: "email-not-confirmed", Message: "User's email address is not confirmed yet"}
	ErrorFederatedProfile     = &exmodels.Error{ID: "federated-profile", Message: "Federated user profile can't be updated"}
	ErrorIdPUnconfigured      = &exmodels.Error{ID: "idp-unconfigured", Message: "Identity provider isn't configured"}
	ErrorIdPUnknown           = &exmodels.Error{ID: "idp-unknown", Message: "Unknown identity provider"}
	ErrorImmutableProperty    = &exmodels.Error{ID: "immutable-property", Message: "Property cannot be updated"}
	ErrorInvalidCredentials   = &exmodels.Error{ID: "invalid-credentials", Message: "Wrong password or user doesn't exist"}
	ErrorInvalidModAction     = &exmodels.Error{ID: "invalid-mod-action", Message: "Invalid moderation action"}
	ErrorInvalidPropertyValue = &exmodels.Error{ID: "invalid-prop-value", Message: "Value of the property is invalid"}
	ErrorInvalidUUID          = &exmodels.Error{ID: "invalid-uuid", Message: "Invalid UUID value"}
	ErrorNoLocalUser          = &exmodels.Error{ID: "no-local-user", Message: "User is not locally authenticated"}
	ErrorNotDomainOwner       = &exmodels.Error{ID: "not-domain-owner", Message: "User is not a domain owner"}
	ErrorNotModerator         = &exmodels.Error{ID: "not-moderator", Message: "User is not a moderator"}
	ErrorOwnerHasDomains      = &exmodels.Error{ID: "owner-has-domains", Message: "Owner can't be deleted as it still owns domains"}
	ErrorPageLocked           = &exmodels.Error{ID: "page-locked", Message: "This page is locked"}
	ErrorSelfVote             = &exmodels.Error{ID: "self-vote", Message: "You cannot vote for your own comment"}
	ErrorSignupsForbidden     = &exmodels.Error{ID: "signups-forbidden", Message: "New signups are forbidden"}
	ErrorSSOURLMissing        = &exmodels.Error{ID: "sso-url-missing", Message: "SSO URL is missing"}
	ErrorUnauthenticated      = &exmodels.Error{ID: "unauthenticated", Message: "User isn't authenticated"}
	ErrorUnknownHost          = &exmodels.Error{ID: "unknown-host", Message: "Unknown host"}
	ErrorUserBanned           = &exmodels.Error{ID: "user-banned", Message: "User is banned"}
	ErrorWrongCurPassword     = &exmodels.Error{ID: "wrong-cur-password", Message: "Wrong current password"}
)
