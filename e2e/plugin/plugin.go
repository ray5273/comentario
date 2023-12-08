package main

import (
	_ "embed"
	"gitlab.com/comentario/comentario/internal/e2e"
)

// Handler is the exported plugin implementation
//
//goland:noinspection GoUnusedGlobalVariable
var Handler e2e.End2EndHandler = &handler{}

//go:embed db-seed.sql
var dbSeedSQL string

// handler is an End2EndHandler implementation
type handler struct {
	app    e2e.End2EndApp // Host app
	mailer *e2eMailer     // e2e mailer instance
}

func (h *handler) AddMailerFailure(email string) {
	h.mailer.addFailure(email)
}

func (h *handler) HandleReset() error {
	h.app.LogInfo("Resetting the e2e plugin")
	return h.reset()
}

func (h *handler) Init(app e2e.End2EndApp) error {
	h.app = app

	// Lift XSRF protection on management and login endpoints
	h.app.XSRFSafePaths().Add(
		"/api/e2e/",
		"/api/auth/login",
		"/api/embed/auth/login",
	)

	// Reset the plugin
	if err := h.reset(); err != nil {
		return err
	}

	h.app.LogInfo("Initialised e2e plugin")
	return nil
}

func (h *handler) Mails() []e2e.MockMail {
	return h.mailer.mails
}

func (h *handler) reset() error {
	// Recreate the mailer
	h.mailer = &e2eMailer{}
	h.app.SetMailer(h.mailer)

	// Reinit the DB to install the seed
	return h.app.RecreateDBSchema(dbSeedSQL)
}
