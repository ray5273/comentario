package svc

import (
	"fmt"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/persistence"
)

// TheServiceManager is a global service manager interface
var TheServiceManager ServiceManager = &manager{}

// db is a global database instance (only available in the services package)
var db *persistence.Database

// ServiceManager provides high-level service management routines
type ServiceManager interface {
	// E2eRecreateDBSchema recreates the DB schema and fills it with the provided seed data (only used for e2e testing)
	E2eRecreateDBSchema(seedSQL string) error
	// Initialise performs necessary initialisation of the services
	Initialise()
	// Run starts background services
	Run()
	// Shutdown performs necessary teardown of the services
	Shutdown()
}

//----------------------------------------------------------------------------------------------------------------------

type manager struct {
	inited bool
}

func (m *manager) E2eRecreateDBSchema(seedSQL string) error {
	logger.Debug("manager.E2eRecreateDBSchema(...)")

	// Make sure the services are initialised
	if !m.inited {
		logger.Fatal("ServiceManager is not initialised")
	}

	// Drop and recreate the public schema
	if err := db.Exec("drop schema public cascade; create schema public;"); err != nil {
		return err
	}

	// Install DB migrations
	if err := db.Migrate(); err != nil {
		return err
	}

	// Insert seed data
	if err := db.Exec(seedSQL); err != nil {
		return err
	}

	// Run post-init tasks
	if err := m.postDBInit(); err != nil {
		return err
	}

	// Succeeded
	return nil
}

func (m *manager) Initialise() {
	logger.Debug("manager.Initialise()")

	// Make sure init isn't called twice
	if m.inited {
		logger.Fatal("ServiceManager is already initialised")
	}
	m.inited = true

	// Init content scanners
	ThePerlustrationService.Init()

	// Initiate a DB connection
	var err error
	if db, err = persistence.InitDB(); err != nil {
		logger.Fatalf("Failed to connect to database: %v", err)
	}

	// Run post-init tasks
	if err := m.postDBInit(); err != nil {
		logger.Fatalf("Post-DB-init tasks failed: %v", err)
	}
}

func (m *manager) Run() {
	// Start the cleanup service
	if err := TheCleanupService.Init(); err != nil {
		logger.Fatalf("Failed to initialise cleanup service: %v", err)
	}
}

func (m *manager) Shutdown() {
	logger.Debug("manager.Shutdown()")

	// Make sure the services are initialised
	if !m.inited {
		return
	}

	// Teardown the database
	_ = db.Shutdown()
	db = nil
	m.inited = false
}

// postDBInit is called after the DB is initialised to finalise schema initialisation
func (m *manager) postDBInit() error {
	// Initialise the config service
	if err := TheDynConfigService.Load(); err != nil {
		return fmt.Errorf("failed to load configuration: %v", err)
	}

	// If superuser's ID or email is provided, turn that user into a superuser
	if s := config.CLIFlags.Superuser; s != "" {
		if err := TheUserService.EnsureSuperuser(s); err != nil {
			return fmt.Errorf("failed to turn user %q into superuser: %v", s, err)
		}
		logger.Infof("User %q is made a superuser", s)
	}

	// Succeeded
	return nil
}
