package svc

import (
	"bytes"
	"fmt"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"html/template"
	"path"
	"reflect"
	"sync"
)

// TheMailService is a global MailService implementation
var TheMailService MailService = &mailService{
	templates: make(map[string]*template.Template),
}

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
type mailService struct {
	templates map[string]*template.Template // Template cache
	templMu   sync.RWMutex                  // Template cache mutex
}

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
		recipient.LangID,
		"",
		recipient.Email,
		"Comentario: New comment on "+page.DisplayTitle(domain),
		"comment-notification.gohtml",
		params)
}

func (svc *mailService) SendConfirmEmail(user *data.User, token *data.Token) error {
	return svc.sendFromTemplate(
		user.LangID,
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
		user.LangID,
		"",
		user.Email,
		"Comentario: Reset your password",
		"reset-password.gohtml",
		map[string]any{
			"ResetURL": config.URLForUI(user.LangID, "", map[string]string{"passwordResetToken": token.String()}),
			"Name":     user.Name,
		})
}

// getTemplate returns a cached template by its language and name, or nil if there's none
func (svc *mailService) getTemplate(lang, name string) *template.Template {
	svc.templMu.RLock()
	defer svc.templMu.RUnlock()
	return svc.templates[lang+"/"+name]
}

// execTemplateFile loads and executes a named template from the corresponding file. Returns the resulting string
func (svc *mailService) execTemplateFile(lang, name string, data map[string]any) (string, error) {
	// If the template hasn't been loaded yet, load and parse it
	templ := svc.getTemplate(lang, name)
	if templ == nil {
		// Create a new template
		filePath := path.Join(config.CLIFlags.TemplatePath, name)
		var err error
		templ, err = template.New(name).
			// Add required functions
			Funcs(template.FuncMap{
				"T": func(id string, args ...reflect.Value) string { return TheI18nService.Translate(lang, id, args...) },
			}).
			// Parse the file
			ParseFiles(filePath)
		if err != nil {
			return "", fmt.Errorf("parsing HTML template file %q failed: %w", filePath, err)
		}

		// Cache the parsed template. We need to "namespace" them by language because the "T" (Translate) function,
		// which takes language as an argument, has been bound during template compilation above
		svc.templMu.Lock()
		svc.templates[lang+"/"+name] = templ
		svc.templMu.Unlock()
		logger.Debugf("Parsed HTML template %q", filePath)
	}

	// Execute the template
	var buf bytes.Buffer
	if err := templ.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("executing template %q failed: %w", name, err)
	}

	// Succeeded
	return buf.String(), nil
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
func (svc *mailService) sendFromTemplate(lang, replyTo, recipient, subject, templateFile string, templateData map[string]any) error {
	logger.Debugf("mailService.sendFromTemplate('%s', '%s', '%s', '%s', ...)", replyTo, recipient, subject, templateFile)

	// Load and execute the template
	body, err := svc.execTemplateFile(lang, templateFile, templateData)
	if err != nil {
		logger.Errorf("Failed to execute HTML template file %s: %v", templateFile, err)
		return err
	}

	// Send the mail, embedding the logo
	return svc.send(replyTo, recipient, subject, body, path.Join(config.CLIFlags.TemplatePath, "images", "logo.png"))
}
