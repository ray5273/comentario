package e2e

import "gitlab.com/comentario/comentario/internal/util"

// End2EndApp describes an application under e2e test
type End2EndApp interface {
	// RecreateDBSchema recreates the DB schema and fills it with the provided seed data
	RecreateDBSchema(seedSQL string) error

	// SetMailer sets the global Mailer instance to be used by the app
	SetMailer(mailer util.Mailer)

	// XSRFSafePaths returns a path registry for the paths excluded from XSRF protection
	XSRFSafePaths() util.PathRegistry

	// LogInfo outputs a record of level info to the log
	LogInfo(fmt string, args ...any)
	// LogWarning outputs a record of level warning to the log
	LogWarning(fmt string, args ...any)
	// LogError outputs a record of level error to the log
	LogError(fmt string, args ...any)
}

// End2EndHandler describes an e2e testing plugin
type End2EndHandler interface {
	// Init binds the app under test to the plugin
	Init(app End2EndApp) error
	// AddMailerFailure adds the given email address to the failure recipient list
	AddMailerFailure(email string)
	// Mails returns all accumulated mock emails
	Mails() []MockMail
	// HandleReset resets the backend to its initial state
	HandleReset() error
}

// MockMail stores information about a "sent" email
type MockMail struct {
	Headers    map[string]string
	EmbedFiles []string
	Body       string
	Succeeded  bool
}
