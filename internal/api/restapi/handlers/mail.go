package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/persistence"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
)

func MailUnsubscribe(params api_general.MailUnsubscribeParams) middleware.Responder {
	// Parse user ID
	uID, r := parseUUID(params.User)
	if r != nil {
		return r
	}

	// Parse domain ID
	dID, r := parseUUID(params.Domain)
	if r != nil {
		return r
	}

	// Parse secret token
	secret, r := parseUUID(params.Secret)
	if r != nil {
		return r
	}

	// Find the domain user
	user, domainUser, err := svc.Services.UserService(nil).FindDomainUserByID(uID, dID)
	if err != nil {
		return respServiceError(err)

		// Make sure the domain user exists
	} else if domainUser == nil {
		return respNotFound(nil)

		// Make sure the secret checks out
	} else if *secret != user.SecretToken {
		respUnauthorized(exmodels.ErrorBadToken)
	}

	// Update the domain user properties
	var changed bool
	switch svc.MailNotificationKind(params.Kind) {
	// Moderator notifications
	case svc.MailNotificationKindModerator:
		changed = domainUser.NotifyModerator
		domainUser.WithNotifyModerator(false)

	// Reply notifications
	case svc.MailNotificationKindReply:
		changed = domainUser.NotifyReplies
		domainUser.WithNotifyReplies(false)

	// Comment status notifications
	case svc.MailNotificationKindCommentStatus:
		changed = domainUser.NotifyCommentStatus
		domainUser.WithNotifyCommentStatus(false)
	}

	// Persist the changes, if any
	if changed {
		err := svc.Services.WithTx(func(tx *persistence.DatabaseTx) error {
			return svc.Services.DomainService(tx).UserModify(domainUser)
		})
		if err != nil {
			return respServiceError(err)
		}
	}

	// Succeeded: redirect to the homepage
	return api_general.NewMailUnsubscribeTemporaryRedirect().
		WithLocation(svc.Services.I18nService().FrontendURL(user.LangID, "", map[string]string{"unsubscribed": "true"}))
}

// sendCommentModNotifications sends a comment notification to all domain moderators
func sendCommentModNotifications(domain *data.Domain, page *data.DomainPage, comment *data.Comment, commenter *data.User) error {
	// Fetch domain moderators to be notified
	mods, err := svc.Services.UserService(nil).ListDomainModerators(&domain.ID, true)
	if err != nil {
		return err
	}

	// Iterate the moderator users
	mail := svc.Services.MailService()
	for _, mod := range mods {
		// Do not email the commenting moderator their own comment
		if mod.ID != commenter.ID {
			_ = mail.SendCommentNotification(svc.MailNotificationKindModerator, mod, true, domain, page, comment, commenter.Name)
		}
	}

	// Succeeded
	return nil
}

// sendCommentReplyNotifications sends a comment reply notification
func sendCommentReplyNotifications(domain *data.Domain, page *data.DomainPage, comment *data.Comment, commenter *data.User) error {
	// Fetch the parent comment
	if parentComment, err := svc.Services.CommentService(nil).FindByID(&comment.ParentID.UUID); err != nil {
		return err

		// No reply notifications for anonymous users and self replies
	} else if parentComment.IsAnonymous() || parentComment.UserCreated.UUID == commenter.ID {
		return nil

		// Find the parent commenter user and the corresponding domain user
	} else if parentUser, parentDomainUser, err := svc.Services.UserService(nil).FindDomainUserByID(&parentComment.UserCreated.UUID, &domain.ID); err != nil {
		return err

		// Don't send notification if reply notifications are turned off
	} else if parentDomainUser != nil && !parentDomainUser.NotifyReplies {
		return nil

		// Send a reply notification
	} else {
		return svc.Services.MailService().SendCommentNotification(
			svc.MailNotificationKindReply,
			parentUser,
			parentUser.IsSuperuser || parentDomainUser.CanModerate(),
			domain,
			page,
			comment,
			commenter.Name)
	}
}

// sendCommentStatusNotifications sends a notification about comment status change
func sendCommentStatusNotifications(domain *data.Domain, page *data.DomainPage, comment *data.Comment) error {
	// No notifications for anonymous comments
	if comment.IsAnonymous() {
		return nil

		// Find the commenter user and the corresponding domain user
	} else if commenter, domainUser, err := svc.Services.UserService(nil).FindDomainUserByID(&comment.UserCreated.UUID, &domain.ID); err != nil {
		return err

		// Don't send notification if comment status notifications are turned off
	} else if domainUser != nil && !domainUser.NotifyCommentStatus {
		return nil

		// Send a comment status notification
	} else {
		return svc.Services.MailService().SendCommentNotification(
			svc.MailNotificationKindCommentStatus,
			commenter,
			false,
			domain,
			page,
			comment,
			commenter.Name)
	}
}

// sendConfirmationEmail sends an email containing a confirmation link to the given user
func sendConfirmationEmail(user *data.User) middleware.Responder {
	// Don't bother if the user is already confirmed
	if user.Confirmed {
		return nil
	}

	// Create a new confirmation token
	token, err := data.NewToken(&user.ID, data.TokenScopeConfirmEmail, util.UserConfirmEmailDuration, false)
	if err != nil {
		return respServiceError(err)
	}

	// Persist the token
	if err := svc.Services.TokenService(nil).Create(token); err != nil {
		return respServiceError(err)
	}

	// Send a confirmation email
	if err = svc.Services.MailService().SendConfirmEmail(user, token); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return nil
}

// sendEmailUpdateConfirmation sends an email containing a link for changing the email, to the given user
func sendEmailUpdateConfirmation(user *data.User, newEmail string) middleware.Responder {
	// Create a new confirmation token
	token, err := data.NewToken(&user.ID, data.TokenScopeConfirmEmailUpdate, util.UserConfirmEmailDuration, false)
	if err != nil {
		return respServiceError(err)
	}

	// Persist the token
	if err := svc.Services.TokenService(nil).Create(token); err != nil {
		return respServiceError(err)
	}

	// Send a confirmation email
	if err = svc.Services.MailService().SendEmailUpdateConfirmEmail(user, token, newEmail, signUserEmailUpdate(user, newEmail)); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return nil
}
