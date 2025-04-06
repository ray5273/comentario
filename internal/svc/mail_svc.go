package svc

import (
	"bytes"
	"encoding/hex"
	"fmt"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"html/template"
	"os"
	"path"
	"reflect"
	"sync"
)

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

// newMailService instantiates a mailService
func newMailService() *mailService {
	return &mailService{
		templates: make(map[string]*template.Template),
	}
}

// mailService is a blueprint MailService implementation
type mailService struct {
	templates map[string]*template.Template // Template cache
	templMu   sync.RWMutex                  // Template cache mutex
}

func (svc *mailService) SendCommentNotification(kind MailNotificationKind, recipient *data.User, canModerate bool, domain *data.Domain, page *data.DomainPage, comment *data.Comment, commenterName string) error {
	lang := recipient.LangID
	i18n := Services.I18nService()
	t := func(id string, args ...reflect.Value) string { return i18n.Translate(lang, id, args...) }

	// Figure out the email title/subject
	var subject string
	if kind == MailNotificationKindCommentStatus {
		subject = t("commentStatusChanged")
	} else {
		subject = t("newCommentOn", reflect.ValueOf(page.DisplayTitle(domain)))
	}

	// Figure out email reason
	var reason string
	switch {
	case kind == MailNotificationKindReply:
		reason = t("notificationNewReply")
	case kind == MailNotificationKindCommentStatus:
		reason = t("notificationCommentStatus")
	case comment.IsPending:
		reason = t("notificationModPending")
	default:
		reason = t("notificationModAll")
	}

	// Prepare params
	params := map[string]any{
		"CanModerate":   canModerate,
		"CommenterName": commenterName,
		"CommentURL":    comment.URL(domain.IsHTTPS, domain.Host, page.Path),
		"EmailReason":   reason,
		"HTML":          template.HTML(comment.HTML),
		"IsApproved":    comment.IsApproved,
		"IsPending":     comment.IsPending,
		"Kind":          kind,
		"Lang":          lang,
		"PageTitle":     page.DisplayTitle(domain),
		"PageURL":       domain.RootURL() + page.Path,
		"Title":         subject,
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
			params["ApproveURL"] = i18n.FrontendURL(lang, commentPropPath, map[string]string{"action": "approve"})
			params["RejectURL"] = i18n.FrontendURL(lang, commentPropPath, map[string]string{"action": "reject"})
			params["PendingReason"] = comment.PendingReason
		}

		// Add delete URL
		params["DeleteURL"] = i18n.FrontendURL(lang, commentPropPath, map[string]string{"action": "delete"})
	}

	// Send out a notification email
	return svc.sendFromTemplate(lang, "", recipient.Email, subject, "comment-notification.gohtml", params)
}

func (svc *mailService) SendConfirmEmail(user *data.User, token *data.Token) error {
	i18n := Services.I18nService()
	t := func(id string) string { return i18n.Translate(user.LangID, id) }
	return svc.sendFromTemplate(
		user.LangID,
		"",
		user.Email,
		t("confirmYourEmail"),
		"action.gohtml",
		map[string]any{
			"ActionAct":     t("confirmEmailAct"),
			"ActionButton":  t("actionConfirmEmail"),
			"ActionRequest": t("confirmEmailRequest"),
			"ActionURL":     config.ServerConfig.URLForAPI("auth/confirm", map[string]string{"access_token": token.Value}),
			"EmailReason":   t("confirmEmailExplanation") + " " + t("ignoreEmail"),
			"Title":         t("confirmYourEmail"),
			"UserName":      user.Name,
		})
}

func (svc *mailService) SendEmailUpdateConfirmEmail(user *data.User, token *data.Token, newEmail string, hmacSignature []byte) error {
	i18n := Services.I18nService()
	t := func(id string) string { return i18n.Translate(user.LangID, id) }
	return svc.sendFromTemplate(
		user.LangID,
		"",
		newEmail,
		t("confirmYourEmailUpdate"),
		"action.gohtml",
		map[string]any{
			"ActionAct":     t("confirmEmailUpdateAct"),
			"ActionButton":  t("actionConfirmEmailUpdate"),
			"ActionRequest": t("confirmEmailUpdateRequest"),
			"ActionURL": config.ServerConfig.URLForAPI(
				"user/email/confirm",
				map[string]string{
					"access_token": token.Value,
					"email":        newEmail,
					"hmac":         hex.EncodeToString(hmacSignature),
				}),
			"EmailReason": t("confirmEmailUpdateExpl") + " " + t("ignoreEmail"),
			"Title":       t("confirmYourEmailUpdate"),
			"UserName":    user.Name,
		})
}

func (svc *mailService) SendPasswordReset(user *data.User, token *data.Token) error {
	i18n := Services.I18nService()
	t := func(id string) string { return i18n.Translate(user.LangID, id) }
	return svc.sendFromTemplate(
		user.LangID,
		"",
		user.Email,
		t("resetYourPassword"),
		"action.gohtml",
		map[string]any{
			"ActionAct":     t("clickButtonBelow"),
			"ActionButton":  t("actionResetPassword"),
			"ActionRequest": t("pwdResetRequest"),
			"ActionURL":     i18n.FrontendURL(user.LangID, "", map[string]string{"passwordResetToken": token.Value}),
			"EmailReason":   t("pwdResetExplanation") + " " + t("ignoreEmail"),
			"Title":         t("resetYourPassword"),
			"UserName":      user.Name,
		})
}

// getTemplate returns a cached template by its language and name, or nil if there's none
func (svc *mailService) getTemplate(lang, name string) *template.Template {
	svc.templMu.RLock()
	defer svc.templMu.RUnlock()
	return svc.templates[lang+"/"+name]
}

// execTemplateFile loads and executes a named template from the corresponding file, as well as the base template.
// Returns the resulting string
func (svc *mailService) execTemplateFile(lang, name string, data map[string]any) (string, error) {
	// Identify a language best matching the requested one
	i18n := Services.I18nService()
	langID := i18n.BestLangFor(lang)

	// If the template hasn't been loaded yet, load and parse it
	templ := svc.getTemplate(langID, name)
	if templ == nil {
		// Create a new template
		templ = template.New(name).
			// Add required functions
			Funcs(template.FuncMap{
				"T": func(id string, args ...reflect.Value) string { return i18n.Translate(langID, id, args...) },
			})

		// Parse the base and the "flesh" template files
		if err := svc.parseTemplateFiles(templ, "_base.gohtml", name); err != nil {
			return "", fmt.Errorf("parsing HTML template files failed: %w", err)
		}

		// Cache the parsed template. We need to "namespace" them by language because the "T" (Translate) function,
		// which takes language as an argument, has been bound during template compilation above
		svc.templMu.Lock()
		svc.templates[langID+"/"+name] = templ
		svc.templMu.Unlock()
		logger.Debugf("Parsed HTML template %q", name)
	}

	// Execute the template
	var buf bytes.Buffer
	if err := templ.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("executing template %q failed: %w", name, err)
	}

	// Succeeded
	return buf.String(), nil
}

// parseTemplateFiles reads and parses the specified template file from the template dir
func (svc *mailService) parseTemplateFiles(t *template.Template, names ...string) error {
	// Read the files
	for _, name := range names {
		s, err := os.ReadFile(path.Join(config.ServerConfig.TemplatePath, name))
		if err == nil {
			_, err = t.Parse(string(s))
		}
		if err != nil {
			return err
		}
	}
	return nil
}

// send an email and log the outcome
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
	return svc.send(
		replyTo,
		recipient,
		"Comentario: "+subject,
		body,
		path.Join(config.ServerConfig.TemplatePath, "images", "logo.png"))
}
