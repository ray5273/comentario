package svc

import (
	"bytes"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/util"
	"html/template"
	"path"
)

// TheMailService is a global MailService implementation
var TheMailService MailService = &mailService{}

// MailService is a service interface for sending mails
type MailService interface {
	// Send sends an email and logs the outcome
	Send(replyTo, recipient, subject, htmlMessage string) error
	// SendCommentNotification sends an email notification about a comment to the given recipient
	SendCommentNotification(recipientEmail, kind, host, path, commenterName, title, html string, commentID *uuid.UUID) error
	// SendFromTemplate sends an email from the provided template and logs the outcome
	SendFromTemplate(replyTo, recipient, subject, templateFile string, templateData map[string]any) error
}

//----------------------------------------------------------------------------------------------------------------------

// mailService is a blueprint MailService implementation
type mailService struct{}

func (svc *mailService) SendCommentNotification(recipientEmail, kind, host, path, commenterName, title, html string, commentID *uuid.UUID) error {
	id := commentID.String()
	unsubToken := "" // TODO new-db do something with that
	return svc.SendFromTemplate(
		"",
		recipientEmail,
		"Comentario: "+title,
		"email-notification.gohtml",
		map[string]any{
			"Kind":           kind,
			"Title":          title,
			"Host":           host,
			"Path":           path,
			"CommentID":      id,
			"CommenterName":  commenterName,
			"HTML":           template.HTML(html),
			"ApproveURL":     config.URLForAPI("email/moderate", map[string]string{"action": "approve", "comment": id, "token": unsubToken}),
			"DeleteURL":      config.URLForAPI("email/moderate", map[string]string{"action": "delete", "comment": id, "token": unsubToken}),
			"UnsubscribeURL": config.URLFor("unsubscribe", map[string]string{"token": unsubToken}),
		})
}

func (svc *mailService) Send(replyTo, recipient, subject, htmlMessage string) error {
	logger.Debugf("mailService.Send('%s', '%s', '%s', ...)", replyTo, recipient, subject)

	// Send a new mail
	err := util.AppMailer.Mail(replyTo, recipient, subject, htmlMessage)
	if err != nil {
		logger.Warningf("Failed to send email to %s: %v", recipient, err)
	} else {
		logger.Debugf("Successfully sent an email to '%s'", recipient)
	}
	return err
}

func (svc *mailService) SendFromTemplate(replyTo, recipient, subject, templateFile string, templateData map[string]any) error {
	logger.Debugf("mailService.SendFromTemplate('%s', '%s', '%s', '%s', ...)", replyTo, recipient, subject, templateFile)

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
		return err
	}

	// Send the mail
	return svc.Send(replyTo, recipient, subject, bufHTML.String())
}
