package main

import (
	_ "embed"
	"gitlab.com/comentario/comentario/internal/intf"
	"time"
)

// Handler is the exported plugin implementation
//
//goland:noinspection GoUnusedGlobalVariable
var Handler intf.End2EndHandler = &handler{}

//go:embed db-seed.sql
var dbSeedSQL string

// handler is an End2EndHandler implementation
type handler struct {
	app        intf.End2EndApp    // Host app
	mailer     *e2eMailer         // e2e mailer instance
	versionSvc *e2eVersionService // e2e version service instance
}

func (h *handler) AddMailerFailure(email string) {
	h.mailer.addFailure(email)
}

func (h *handler) HandleReset() error {
	h.app.LogInfo("Resetting the e2e plugin")
	return h.reset()
}

func (h *handler) Init(app intf.End2EndApp) error {
	h.app = app

	// Lift XSRF protection on management and login endpoints
	h.app.XSRFSafePaths().Add(
		"api/e2e/",
		"api/auth/login",
		"api/embed/auth/login",
	)

	// Reset the plugin
	if err := h.reset(); err != nil {
		return err
	}

	h.app.LogInfo("Initialised e2e plugin")
	return nil
}

func (h *handler) Mails() []intf.MockMail {
	return h.mailer.mails
}

func (h *handler) SetLatestRelease(name, version, pageURL string) {
	h.versionSvc.latestRM = &e2eReleaseMetadata{
		name:    name,
		version: version,
		pageURL: pageURL,
	}
}

func (h *handler) reset() error {
	// Recreate the mailer
	h.mailer = &e2eMailer{}
	h.app.SetMailer(h.mailer)

	// Replace the version service
	h.versionSvc = &e2eVersionService{
		cur:   "1.2.3",
		built: time.Now().UTC(),
		latestRM: &e2eReleaseMetadata{
			name:    "v1.2.3",
			version: "v1.2.3",
			pageURL: "https://gitlab.com/comentario/comentario/-/releases",
		},
	}
	h.app.SetVersionService(h.versionSvc)

	// Reinit the DB to install the seed
	return h.app.RecreateDBSchema(dbSeedSQL)
}
