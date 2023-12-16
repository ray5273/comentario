package svc

import (
	"bytes"
	"fmt"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"html/template"
	"path"
)

// TheMailService is a global MailService implementation
var TheMailService MailService = &mailService{}

type MailNotificationKind string

const (
	MailNotificationKindReply     = MailNotificationKind("reply")
	MailNotificationKindModerator = MailNotificationKind("moderator")
)

// MailService is a service interface for sending mails
type MailService interface {
	// SendCommentNotification sends an email notification about a comment to the given recipient
	SendCommentNotification(kind MailNotificationKind, recipient *data.User, canModerate bool, domain *data.Domain, page *data.DomainPage, comment *data.Comment, commenterName string) error
	// SendConfirmEmail sends an email with a confirmation link
	SendConfirmEmail(user *data.User, token *data.Token) error
	// SendPasswordReset sends an email with a password reset link
	SendPasswordReset(user *data.User, token *data.Token) error
}

//----------------------------------------------------------------------------------------------------------------------

// mailService is a blueprint MailService implementation
type mailService struct{}

func (svc *mailService) SendCommentNotification(kind MailNotificationKind, recipient *data.User, canModerate bool, domain *data.Domain, page *data.DomainPage, comment *data.Comment, commenterName string) error {
	// Prepare params
	params := map[string]any{
		"Kind":          kind,
		"CanModerate":   canModerate,
		"CommenterName": commenterName,
		"CommentURL":    comment.URL(domain.IsHTTPS, domain.Host, page.Path),
		"HTML":          template.HTML(comment.HTML),
		"IsPending":     comment.IsPending,
		"PageTitle":     page.DisplayTitle(domain),
		"PageURL":       domain.RootURL() + page.Path,
		"UnsubscribeURL": config.URLForAPI(
			"mail/unsubscribe",
			map[string]string{
				"domain": domain.ID.String(),
				"user":   recipient.ID.String(),
				"secret": recipient.SecretToken.String(),
				"kind":   string(kind),
			}),
	}

	// If the user is a moderator
	if canModerate {
		// UI path for the comment properties page
		commentPropPath := fmt.Sprintf("manage/domains/%s/comments/%s", &domain.ID, &comment.ID)

		// Add moderation URLs and a reason only for pending comments
		if comment.IsPending {
			params["ApproveURL"] = config.URLForUI(recipient.LangID, commentPropPath, map[string]string{"action": "approve"})
			params["RejectURL"] = config.URLForUI(recipient.LangID, commentPropPath, map[string]string{"action": "reject"})
			params["PendingReason"] = comment.PendingReason
		}

		// Add delete URL
		params["DeleteURL"] = config.URLForUI(recipient.LangID, commentPropPath, map[string]string{"action": "delete"})
	}

	// Send out a notification email
	return svc.sendFromTemplate(
		"",
		recipient.Email,
		"Comentario: New comment on "+page.DisplayTitle(domain),
		"comment-notification.gohtml",
		params)
}

func (svc *mailService) SendConfirmEmail(user *data.User, token *data.Token) error {
	return svc.sendFromTemplate(
		"",
		user.Email,
		"Comentario: Please confirm your email address",
		"confirm-email.gohtml",
		map[string]any{
			"ConfirmURL": config.URLForAPI("auth/confirm", map[string]string{"access_token": token.String()}),
			"Name":       user.Name,
		})
}

func (svc *mailService) SendPasswordReset(user *data.User, token *data.Token) error {
	return svc.sendFromTemplate(
		"",
		user.Email,
		"Comentario: Reset your password",
		"reset-password.gohtml",
		map[string]any{
			"ResetURL": config.URLForUI(user.LangID, "", map[string]string{"passwordResetToken": token.String()}),
			"Name":     user.Name,
		})
}

// Send sends an email and logs the outcome
func (svc *mailService) send(replyTo, recipient, subject, htmlMessage string, embedFiles ...string) error {
	logger.Debugf("mailService.send('%s', '%s', '%s', ...)", replyTo, recipient, subject)

	// Send a new mail
	err := util.TheMailer.Mail(replyTo, recipient, subject, htmlMessage, embedFiles...)
	if err != nil {
		logger.Warningf("Failed to send email to %s: %v", recipient, err)
	} else {
		logger.Debugf("Successfully sent an email to '%s'", recipient)
	}
	return err
}

// sendFromTemplate sends an email from the provided template and logs the outcome
func (svc *mailService) sendFromTemplate(replyTo, recipient, subject, templateFile string, templateData map[string]any) error {
	logger.Debugf("mailService.sendFromTemplate('%s', '%s', '%s', '%s', ...)", replyTo, recipient, subject, templateFile)

	// Load and parse the template
	filename := path.Join(config.CLIFlags.TemplatePath, templateFile)
	t, err := template.ParseFiles(filename)
	if err != nil {
		logger.Errorf("Failed to parse HTML template file %s: %v", filename, err)
		return err
	}
	logger.Debugf("Parsed HTML template '%s'", filename)

	// Execute the template
	var bufHTML bytes.Buffer
	if err := t.Execute(&bufHTML, templateData); err != nil {
		logger.Errorf("Failed to execute HTML template file %s: %v", filename, err)
		return err
	}

	// Send the mail (embed the logo)
	return svc.send(
		replyTo,
		recipient,
		subject,
		bufHTML.String(),
		path.Join(config.CLIFlags.TemplatePath, "images", "logo.png"))
}
