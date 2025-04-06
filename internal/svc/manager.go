package svc

import (
	"fmt"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/intf"
	"gitlab.com/comentario/comentario/internal/persistence"
	"sync"
)

// Services is a global service serviceManager interface
var Services ServiceManager = &serviceManager{
	plugMgr: newPluginManager(),
	verSvc:  &versionService{},
	wsSvc:   newWebSocketsService(),
}

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

	// GravatarProcessor returns an instance of GravatarProcessor
	GravatarProcessor() GravatarProcessor

	// AuthService returns an instance of AuthService
	AuthService(tx *persistence.DatabaseTx) AuthService
	// AuthSessionService returns an instance of AuthSessionService
	AuthSessionService(tx *persistence.DatabaseTx) AuthSessionService
	// AvatarService returns an instance of AvatarService
	AvatarService(tx *persistence.DatabaseTx) AvatarService
	// CommentService returns an instance of CommentService
	CommentService(tx *persistence.DatabaseTx) CommentService
	// DomainConfigService returns an instance of DomainConfigService
	DomainConfigService(tx *persistence.DatabaseTx) DomainConfigService
	// DomainService returns an instance of DomainService
	DomainService(tx *persistence.DatabaseTx) DomainService
	// DynConfigService returns an instance of DynConfigService
	DynConfigService(tx *persistence.DatabaseTx) DynConfigService
	// I18nService returns an instance of I18nService
	I18nService() I18nService
	// ImportExportService returns an instance of ImportExportService
	ImportExportService(tx *persistence.DatabaseTx) ImportExportService
	// MailService returns an instance of MailService
	MailService() MailService
	// PageService returns an instance of PageService
	PageService(tx *persistence.DatabaseTx) PageService
	// PerlustrationService returns an instance of PerlustrationService
	PerlustrationService() PerlustrationService
	// PluginManager returns an instance of PluginManager
	PluginManager() PluginManager
	// StatsService returns an instance of StatsService
	StatsService(tx *persistence.DatabaseTx) StatsService
	// TokenService returns an instance of TokenService
	TokenService(tx *persistence.DatabaseTx) TokenService
	// UserService returns an instance of UserService
	UserService(tx *persistence.DatabaseTx) UserService
	// VersionService returns an instance of VersionService
	VersionService() intf.VersionService
	// WebSocketsService returns an instance of WebSocketsService
	WebSocketsService() WebSocketsService

	// SetVersionService updates the stored instance of VersionService (used in tests)
	SetVersionService(v intf.VersionService)
}

//----------------------------------------------------------------------------------------------------------------------

// dbAware is a base implementation of persistence.TxAware
type dbAware struct {
	tx *persistence.DatabaseTx // Optional transaction
}

func (d *dbAware) Tx() *persistence.DatabaseTx {
	return d.tx
}

// dbx returns a database executor to be used with database statements and queries: the transaction, if set, otherwise
// the database itself
func (d *dbAware) dbx() persistence.DBX {
	if d.tx != nil {
		return d.tx
	}
	return db
}

//----------------------------------------------------------------------------------------------------------------------

type serviceManager struct {
	inited   bool
	gp       GravatarProcessor    // Instance of a GravatarProcessor (lazy-inited)
	gpMu     sync.Mutex           // Mutex for gp
	cleanSvc CleanupService       // Cleanup service singleton
	i18nSvc  I18nService          // I18n service singleton
	mailSvc  MailService          // Mail service singleton
	perlSvc  PerlustrationService // Perlustration service singleton
	plugMgr  PluginManager        // Plugin manager singleton
	verSvc   intf.VersionService  // Version service singleton
	wsSvc    WebSocketsService    // WebSockets service singleton
}

func (m *serviceManager) GravatarProcessor() GravatarProcessor {
	m.gpMu.Lock()
	defer m.gpMu.Unlock()
	if m.gp == nil {
		m.gp = newGravatarProcessor()
	}
	return m.gp
}

func (m *serviceManager) AuthService(tx *persistence.DatabaseTx) AuthService {
	return &authService{dbAware{tx}}
}

func (m *serviceManager) AuthSessionService(tx *persistence.DatabaseTx) AuthSessionService {
	return &authSessionService{dbAware{tx}}
}

func (m *serviceManager) AvatarService(tx *persistence.DatabaseTx) AvatarService {
	return &avatarService{dbAware{tx}}
}

func (m *serviceManager) CommentService(tx *persistence.DatabaseTx) CommentService {
	return &commentService{dbAware{tx}}
}

func (m *serviceManager) DomainConfigService(tx *persistence.DatabaseTx) DomainConfigService {
	//TODO implement me
	panic("implement me")
}

func (m *serviceManager) DomainService(tx *persistence.DatabaseTx) DomainService {
	return &domainService{dbAware{tx}}
}

func (m *serviceManager) DynConfigService(tx *persistence.DatabaseTx) DynConfigService {
	//TODO implement me
	panic("implement me")
}

func (m *serviceManager) I18nService() I18nService {
	if m.i18nSvc == nil {
		panic("serviceManager: I18nService hasn't been initialised yet")
	}
	return m.i18nSvc
}

func (m *serviceManager) ImportExportService(tx *persistence.DatabaseTx) ImportExportService {
	return &importExportService{dbAware{tx}}
}

func (m *serviceManager) MailService() MailService {
	if m.mailSvc == nil {
		m.mailSvc = newMailService()
	}
	return m.mailSvc
}

func (m *serviceManager) PageService(tx *persistence.DatabaseTx) PageService {
	return &pageService{dbAware{tx}}
}

func (m *serviceManager) PerlustrationService() PerlustrationService {
	return m.perlSvc
}

func (m *serviceManager) PluginManager() PluginManager {
	return m.plugMgr
}

func (m *serviceManager) StatsService(tx *persistence.DatabaseTx) StatsService {
	return &statsService{dbAware{tx}}
}

func (m *serviceManager) TokenService(tx *persistence.DatabaseTx) TokenService {
	return &tokenService{dbAware{tx}}
}

func (m *serviceManager) UserService(tx *persistence.DatabaseTx) UserService {
	return &userService{dbAware{tx}}
}

func (m *serviceManager) VersionService() intf.VersionService {
	return m.verSvc
}

func (m *serviceManager) SetVersionService(v intf.VersionService) {
	m.verSvc = v
}

func (m *serviceManager) WebSocketsService() WebSocketsService {
	return m.wsSvc
}

func (m *serviceManager) E2eRecreateDBSchema(seedSQL string) error {
	logger.Debug("serviceManager.E2eRecreateDBSchema(...)")

	// Make sure the services are initialised
	if !m.inited {
		logger.Fatal("ServiceManager is not initialised")
	}

	// Drop and recreate the public schema
	if err := db.RecreateSchema(); err != nil {
		return err
	}

	// Install DB migrations and the seed
	if err := db.Migrate(seedSQL); err != nil {
		return err
	}

	// Run post-init tasks
	if err := m.postDBInit(); err != nil {
		return err
	}

	// Succeeded
	return nil
}

func (m *serviceManager) Initialise() {
	logger.Debug("serviceManager.Initialise()")

	// Make sure init isn't called twice
	if m.inited {
		logger.Fatal("ServiceManager is already initialised")
	}
	m.inited = true

	// Init i18n
	var err error
	m.i18nSvc = newI18nService()
	if err = m.i18nSvc.Init(); err != nil {
		logger.Fatalf("Failed to initialise i18n: %v", err)
	}

	// Init content scanners
	m.perlSvc = &perlustrationService{}
	m.perlSvc.Init()

	// Initiate a DB connection
	if db, err = persistence.InitDB(); err != nil {
		logger.Fatalf("Failed to connect to database: %v", err)
	}

	// Run post-init tasks
	if err := m.postDBInit(); err != nil {
		logger.Fatalf("Post-DB-init tasks failed: %v", err)
	}

	// Activate plugins
	if err := m.plugMgr.ActivatePlugins(); err != nil {
		logger.Fatalf("Failed to activate plugins: %v", err)
	}
}

func (m *serviceManager) Run() {
	// Start the cleanup service
	m.cleanSvc = &cleanupService{}
	if err := m.cleanSvc.Run(); err != nil {
		logger.Fatalf("Failed to run cleanup service: %v", err)
	}

	// Start the websockets service, if enabled
	if config.ServerConfig.DisableLiveUpdate {
		logger.Info("Live update is disabled")
	} else {
		logger.Info("Live update is enabled, starting WebSockets service")
		if err := m.wsSvc.Run(); err != nil {
			logger.Fatalf("Failed to start websockets service: %v", err)
		}
	}
}

func (m *serviceManager) Shutdown() {
	logger.Debug("serviceManager.Shutdown()")

	// Make sure the services are initialised
	if !m.inited {
		return
	}

	// Shut down the services
	m.wsSvc.Shutdown()
	m.plugMgr.Shutdown()

	// Teardown the database
	_ = db.Shutdown()
	db = nil
	m.inited = false
}

// postDBInit is called after the DB is initialised to finalise schema initialisation
func (m *serviceManager) postDBInit() error {
	// Initialise the config service
	if err := TheDynConfigService.Load(); err != nil {
		return fmt.Errorf("failed to load configuration: %v", err)
	}

	// Reset any cached config
	TheDomainConfigService.ResetCache()

	// If superuser's ID or email is provided, turn that user into a superuser
	if s := config.ServerConfig.Superuser; s != "" {
		if err := m.UserService(nil).EnsureSuperuser(s); err != nil {
			return fmt.Errorf("failed to turn user %q into superuser: %v", s, err)
		}
		logger.Infof("User %q is made a superuser", s)
	}

	// Succeeded
	return nil
}
