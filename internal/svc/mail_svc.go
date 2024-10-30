package svc

import (
	"bytes"
	"encoding/hex"
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
	MailNotificationKindReply         = MailNotificationKind("reply")
	MailNotificationKindModerator     = MailNotificationKind("moderator")
	MailNotificationKindCommentStatus = MailNotificationKind("commentStatus")
)

// MailService is a service interface for sending mails
type MailService interface {
	// SendCommentNotification sends an email notification about a comment to the given recipient
	SendCommentNotification(kind MailNotificationKind, recipient *data.User, canModerate bool, domain *data.Domain, page *data.DomainPage, comment *data.Comment, commenterName string) error
	// SendConfirmEmail sends an email with a confirmation link
	SendConfirmEmail(user *data.User, token *data.Token) error
	// SendEmailUpdateConfirmEmail sends an email for changing the given user's email address
	SendEmailUpdateConfirmEmail(user *data.User, token *data.Token, newEmail string, hmacSignature []byte) error
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
		"IsApproved":    comment.IsApproved,
		"PageTitle":     page.DisplayTitle(domain),
		"PageURL":       domain.RootURL() + page.Path,
		"UnsubscribeURL": config.ServerConfig.URLForAPI(
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
			params["ApproveURL"] = TheI18nService.FrontendURL(recipient.LangID, commentPropPath, map[string]string{"action": "approve"})
			params["RejectURL"] = TheI18nService.FrontendURL(recipient.LangID, commentPropPath, map[string]string{"action": "reject"})
			params["PendingReason"] = comment.PendingReason
		}

		// Add delete URL
		params["DeleteURL"] = TheI18nService.FrontendURL(recipient.LangID, commentPropPath, map[string]string{"action": "delete"})
	}

	// Figure out the email subject
	var subject string
	if kind == MailNotificationKindCommentStatus {
		subject = TheI18nService.Translate(recipient.LangID, "commentStatusChanged")
	} else {
		subject = TheI18nService.Translate(recipient.LangID, "newCommentOn", reflect.ValueOf(page.DisplayTitle(domain)))
	}

	// Send out a notification email
	return svc.sendFromTemplate(recipient.LangID, "", recipient.Email, subject, "comment-notification.gohtml", params)
}

func (svc *mailService) SendConfirmEmail(user *data.User, token *data.Token) error {
	return svc.sendFromTemplate(
		user.LangID,
		"",
		user.Email,
		TheI18nService.Translate(user.LangID, "confirmYourEmail"),
		"confirm-email.gohtml",
		map[string]any{
			"ConfirmURL": config.ServerConfig.URLForAPI("auth/confirm", map[string]string{"access_token": token.Value}),
			"Name":       user.Name,
		})
}

func (svc *mailService) SendEmailUpdateConfirmEmail(user *data.User, token *data.Token, newEmail string, hmacSignature []byte) error {
	return svc.sendFromTemplate(
		user.LangID,
		"",
		newEmail,
		TheI18nService.Translate(user.LangID, "confirmYourEmailUpdate"),
		"confirm-email-update.gohtml",
		map[string]any{
			"ConfirmURL": config.ServerConfig.URLForAPI("user/email/confirm", map[string]string{"access_token": token.Value, "hmac": hex.EncodeToString(hmacSignature)}),
			"Name":       user.Name,
		})
}

func (svc *mailService) SendPasswordReset(user *data.User, token *data.Token) error {
	return svc.sendFromTemplate(
		user.LangID,
		"",
		user.Email,
		TheI18nService.Translate(user.LangID, "resetYourPassword"),
		"reset-password.gohtml",
		map[string]any{
			"ResetURL": TheI18nService.FrontendURL(user.LangID, "", map[string]string{"passwordResetToken": token.Value}),
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
		filePath := path.Join(config.ServerConfig.TemplatePath, name)
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

	// Send the mail, prepending the subject with the app name and embedding the logo
	return svc.send(replyTo, recipient, "Comentario: "+subject, body, path.Join(config.ServerConfig.TemplatePath, "images", "logo.png"))
}
