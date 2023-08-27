package main

import "gitlab.com/comentario/comentario/internal/e2e"
import _ "embed"

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

	// Reset the mailer
	h.mailer = &e2eMailer{}

	// Drop and recreate the public schema
	return h.app.RecreateDBSchema(dbSeedSQL)
}

func (h *handler) Init(app e2e.End2EndApp) error {
	h.app = app

	// Init the Mailer
	h.mailer = &e2eMailer{}
	h.app.SetMailer(h.mailer)

	// Reinit the DB to install the seed
	if err := h.app.RecreateDBSchema(dbSeedSQL); err != nil {
		return err
	}

	h.app.LogInfo("Initialised e2e plugin")
	return nil
}

func (h *handler) Mails() []e2e.MockMail {
	return h.mailer.mails
}
