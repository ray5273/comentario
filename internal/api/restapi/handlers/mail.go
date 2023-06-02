package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
)

// sendCommentModNotifications sends a comment notification to all domain moderators
func sendCommentModNotifications(domain *data.Domain, page *data.DomainPage, comment *data.Comment, user *data.User) error {
	// Determine notification kind
	kind := ""
	if !comment.IsApproved {
		kind = "moderation"
	}

	// Fetch domain moderators to be notified
	mods, err := svc.TheUserService.ListDomainModerators(&domain.ID, true)
	if err != nil {
		return err
	}

	// Iterate the moderator users
	for _, m := range mods {
		// Do not email the commenting moderator their own comment
		if m.ID == user.ID {
			continue
		}

		// Send a notification (ignore errors)
		_ = svc.TheMailService.SendCommentNotification(
			m.Email,
			kind,
			domain.Host,
			page.Path,
			user.Name,
			page.DisplayTitle(domain),
			comment.HTML,
			&comment.ID)
	}

	// Succeeded
	return nil
}

// sendCommentReplyNotifications sends a comment reply notification
func sendCommentReplyNotifications(domain *data.Domain, page *data.DomainPage, comment *data.Comment, user *data.User) error {
	// Fetch the parent comment
	if parentComment, err := svc.TheCommentService.FindByID(&comment.ParentID.UUID); err != nil {
		return err

		// No reply notifications for anonymous users and self replies
	} else if parentComment.IsAnonymous() || parentComment.UserCreated.UUID == user.ID {
		return nil

		// Find the parent commenter user and the corresponding domain user
	} else if parentUser, parentDomainUser, err := svc.TheUserService.FindDomainUserByID(&parentComment.UserCreated.UUID, &domain.ID); err != nil {
		return err

		// Don't send notification if reply notifications are turned off
	} else if parentDomainUser != nil && !parentDomainUser.NotifyReplies {
		return nil

		// Send a reply notification
	} else {
		_ = svc.TheMailService.SendCommentNotification(
			parentUser.Email,
			"reply",
			domain.Host,
			page.Path,
			user.Name,
			page.DisplayTitle(domain),
			comment.HTML,
			&comment.ID)
	}

	// Succeeded
	return nil
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
	if err := svc.TheTokenService.Create(token); err != nil {
		return respServiceError(err)
	}

	// Send a confirmation email
	err = svc.TheMailService.SendFromTemplate(
		"",
		user.Email,
		"Please confirm your email address",
		"confirm-hex.gohtml",
		map[string]any{"URL": config.URLForAPI("owner/confirm-hex", map[string]string{"confirmHex": token.String()})})
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return nil
}

// sendPasswordResetEmail sends an email containing a password reset link
func sendPasswordResetEmail(email string) middleware.Responder {
	// Find the local user with that email
	if user, err := svc.TheUserService.FindUserByEmail(email, true); err == svc.ErrNotFound {
		// No such email: apply a random delay to discourage email polling
		util.RandomSleep(util.WrongAuthDelayMin, util.WrongAuthDelayMax)

	} else if err != nil {
		// Any other error
		return respServiceError(err)

		// User found. Generate a random password-reset token
	} else if token, err := data.NewToken(&user.ID, data.TokenScopeResetPassword, util.UserPwdResetDuration, false); err != nil {
		return respServiceError(err)

		// Persist the token
	} else if err := svc.TheTokenService.Create(token); err != nil {
		return respServiceError(err)

		// Send out an email
	} else if err := svc.TheMailService.SendFromTemplate(
		"",
		user.Email,
		"Reset your password",
		"reset-password.gohtml",
		map[string]any{"URL": config.URLForUI("en", "", map[string]string{"passwordResetToken": token.String()})},
	); err != nil {
		return respServiceError(err)
	}

	// Succeeded (or no user found)
	return nil
}
