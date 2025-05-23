package svc

import (
	"fmt"
	"github.com/doug-martin/goqu/v9/exp"
	xintf "gitlab.com/comentario/comentario/extend/intf"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/intf"
	"gitlab.com/comentario/comentario/internal/persistence"
	"sync"
)

// Services is a global service serviceManager interface
var Services ServiceManager = newServiceManager()

// ServiceManager provides high-level service management routines
type ServiceManager interface {
	// CreateTx creates and returns a new database transaction
	CreateTx() (*persistence.DatabaseTx, error)
	// DBVersion returns the current database version string
	DBVersion() string
	// E2eRecreateDBSchema recreates the DB schema and fills it with the provided seed data (only used for e2e testing)
	E2eRecreateDBSchema(seedSQL string) error
	// Initialise performs necessary initialisation of the services
	Initialise()
	// Run starts background services
	Run()
	// SetVersionService updates the stored instance of VersionService (used in tests)
	SetVersionService(v intf.VersionService)
	// Shutdown performs necessary teardown of the services
	Shutdown()

	// AuthService returns an instance of AuthService
	AuthService(tx *persistence.DatabaseTx) AuthService
	// AuthSessionService returns an instance of AuthSessionService
	AuthSessionService(tx *persistence.DatabaseTx) AuthSessionService
	// AvatarService returns an instance of AvatarService
	AvatarService(tx *persistence.DatabaseTx) AvatarService
	// CommentService returns an instance of CommentService
	CommentService(tx *persistence.DatabaseTx) CommentService
	// DomainAttrService returns an instance of an plugin.AttrStore for domains
	DomainAttrService(tx *persistence.DatabaseTx) xintf.AttrStore
	// DomainConfigService returns an instance of DomainConfigService
	DomainConfigService(tx *persistence.DatabaseTx) DomainConfigService
	// DomainService returns an instance of DomainService
	DomainService(tx *persistence.DatabaseTx) DomainService
	// DynConfigService returns an instance of DynConfigService
	DynConfigService() DynConfigService
	// GravatarProcessor returns an instance of GravatarProcessor
	GravatarProcessor() GravatarProcessor
	// I18nService returns an instance of I18nService
	I18nService() I18nService
	// ImportExportService returns an instance of ImportExportService
	ImportExportService(tx *persistence.DatabaseTx) ImportExportService
	// MailService returns an instance of MailService
	MailService() MailService
	// PageService returns an instance of PageService
	PageService(tx *persistence.DatabaseTx) PageService
	// PageTitleFetcher returns an instance of PageTitleFetcher
	PageTitleFetcher() PageTitleFetcher
	// PerlustrationService returns an instance of PerlustrationService
	PerlustrationService() PerlustrationService
	// PluginManager returns an instance of PluginManager
	PluginManager() PluginManager
	// StartOfDay returns an expression for truncating the given datetime database table column to the start of day
	StartOfDay(col string) exp.LiteralExpression
	// StatsService returns an instance of StatsService
	StatsService(tx *persistence.DatabaseTx) StatsService
	// TokenService returns an instance of TokenService
	TokenService(tx *persistence.DatabaseTx) TokenService
	// UserService returns an instance of UserService
	UserService(tx *persistence.DatabaseTx) UserService
	// UserAttrService returns an instance of an plugin.AttrStore for users
	UserAttrService(tx *persistence.DatabaseTx) xintf.AttrStore
	// VersionService returns an instance of VersionService
	VersionService() intf.VersionService
	// WebSocketsService returns an instance of WebSocketsService
	WebSocketsService() WebSocketsService
	// WithTx executes the given function in the context of a newly-created transaction (passed to the function)
	WithTx(func(tx *persistence.DatabaseTx) error) error
}

//----------------------------------------------------------------------------------------------------------------------

// dbTxAware is a database implementation of persistence.Tx
type dbTxAware struct {
	tx *persistence.DatabaseTx // Optional transaction
	db *persistence.Database   // Connected database instance
}

// dbx returns a database executor to be used with database statements and queries: the transaction, if set, otherwise
// the database itself
func (d *dbTxAware) dbx() persistence.DBX {
	if d.tx != nil {
		return d.tx
	}
	if d.db == nil {
		panic("dbTxAware.dbx: db not assigned")
	}
	return d.db
}

//----------------------------------------------------------------------------------------------------------------------

type serviceManager struct {
	inited      bool
	db          *persistence.Database // Connected database instance
	gp          GravatarProcessor     // Instance of a GravatarProcessor (lazy-inited)
	gpMu        sync.Mutex            // Mutex for gp
	ptf         PageTitleFetcher      // Instance of a PageTitleFetcher (lazy-inited)
	ptfMu       sync.Mutex            // Mutex for ptf
	cleanSvc    CleanupService        // Cleanup service singleton
	domCfgCache *domainConfigCache    // Domain config cache singleton
	dynCfgSvc   DynConfigService      // Dynamic config service singleton
	i18nSvc     I18nService           // I18n service singleton
	mailSvc     MailService           // Mail service singleton
	perlSvc     PerlustrationService  // Perlustration service singleton
	plugMgr     PluginManager         // Plugin manager singleton
	verSvc      intf.VersionService   // Version service singleton
	wsSvc       WebSocketsService     // WebSockets service singleton
	domainAttrs *attrStore            // Cached domain attribute store singleton
	userAttrs   *attrStore            // Cached user attribute store singleton
}

func newServiceManager() *serviceManager {
	return &serviceManager{
		domCfgCache: newDomainConfigCache(),
		i18nSvc:     newI18nService(),
		mailSvc:     newMailService(),
		perlSvc:     &perlustrationService{},
		plugMgr:     newPluginManager(),
		verSvc:      &versionService{},
		wsSvc:       newWebSocketsService(),
		domainAttrs: newAttrStore("cm_domain_attrs", "domain_id", false),
		userAttrs:   newAttrStore("cm_user_attrs", "user_id", true),
	}
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
	return &authService{dbTxAware{tx: tx, db: m.db}}
}

func (m *serviceManager) AuthSessionService(tx *persistence.DatabaseTx) AuthSessionService {
	return &authSessionService{dbTxAware{tx: tx, db: m.db}}
}

func (m *serviceManager) AvatarService(tx *persistence.DatabaseTx) AvatarService {
	return &avatarService{dbTxAware{tx: tx, db: m.db}}
}

func (m *serviceManager) CommentService(tx *persistence.DatabaseTx) CommentService {
	return &commentService{dbTxAware{tx: tx, db: m.db}}
}

func (m *serviceManager) CreateTx() (*persistence.DatabaseTx, error) {
	return m.db.Begin()
}

func (m *serviceManager) DBVersion() string {
	return m.db.Version()
}

func (m *serviceManager) DomainAttrService(tx *persistence.DatabaseTx) xintf.AttrStore {
	return newTxAttrStore(m.domainAttrs, tx, m.db)
}

func (m *serviceManager) DomainConfigService(tx *persistence.DatabaseTx) DomainConfigService {
	return newDomainConfigService(m.domCfgCache, tx, m.db)
}

func (m *serviceManager) DomainService(tx *persistence.DatabaseTx) DomainService {
	return &domainService{dbTxAware{tx: tx, db: m.db}}
}

func (m *serviceManager) DynConfigService() DynConfigService {
	return m.dynCfgSvc
}

func (m *serviceManager) E2eRecreateDBSchema(seedSQL string) error {
	logger.Debug("serviceManager.E2eRecreateDBSchema(...)")

	// Make sure the services are initialised
	if !m.inited {
		logger.Fatal("ServiceManager is not initialised")
	}

	// Drop and recreate the public schema
	if err := m.db.RecreateSchema(); err != nil {
		return err
	}

	// Install DB migrations and the seed
	if err := m.db.Migrate(seedSQL); err != nil {
		return err
	}

	// Run post-init tasks
	if err := m.postDBInit(); err != nil {
		return err
	}

	// Succeeded
	return nil
}

func (m *serviceManager) I18nService() I18nService {
	if !m.i18nSvc.Inited() {
		panic("serviceManager: I18nService hasn't been initialised yet")
	}
	return m.i18nSvc
}

func (m *serviceManager) ImportExportService(tx *persistence.DatabaseTx) ImportExportService {
	return &importExportService{dbTxAware{tx: tx, db: m.db}}
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
	if err = m.i18nSvc.Init(); err != nil {
		logger.Fatalf("Failed to initialise i18n: %v", err)
	}

	// Init content scanners
	m.perlSvc.Init()

	// Initiate a DB connection
	if m.db, err = persistence.InitDB(); err != nil {
		logger.Fatalf("Failed to connect to database: %v", err)
	}

	// Run post-init tasks
	if err := m.postDBInit(); err != nil {
		logger.Fatalf("Post-DB-init tasks failed: %v", err)
	}

	// Activate plugins
	if err := m.WithTx(m.plugMgr.ActivatePlugins); err != nil {
		logger.Fatalf("Failed to activate plugins: %v", err)
	}
}

func (m *serviceManager) MailService() MailService {
	return m.mailSvc
}

func (m *serviceManager) PageService(tx *persistence.DatabaseTx) PageService {
	return &pageService{dbTxAware{tx: tx, db: m.db}}
}

func (m *serviceManager) PageTitleFetcher() PageTitleFetcher {
	m.ptfMu.Lock()
	defer m.ptfMu.Unlock()
	if m.ptf == nil {
		m.ptf = newPageTitleFetcher()
	}
	return m.ptf
}

func (m *serviceManager) PerlustrationService() PerlustrationService {
	return m.perlSvc
}

func (m *serviceManager) PluginManager() PluginManager {
	return m.plugMgr
}

func (m *serviceManager) Run() {
	// Start the cleanup service
	m.cleanSvc = NewCleanupService(m.db)
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
	m.cleanSvc.Shutdown()
	_ = m.WithTx(m.plugMgr.Shutdown)

	// Teardown the database
	_ = m.db.Shutdown()
	m.db = nil
	m.inited = false
}

func (m *serviceManager) StartOfDay(col string) exp.LiteralExpression {
	return m.db.StartOfDay(col)
}

func (m *serviceManager) StatsService(tx *persistence.DatabaseTx) StatsService {
	return &statsService{dbTxAware{tx: tx, db: m.db}}
}

func (m *serviceManager) TokenService(tx *persistence.DatabaseTx) TokenService {
	return &tokenService{dbTxAware{tx: tx, db: m.db}}
}

func (m *serviceManager) UserAttrService(tx *persistence.DatabaseTx) xintf.AttrStore {
	return newTxAttrStore(m.userAttrs, tx, m.db)
}

func (m *serviceManager) UserService(tx *persistence.DatabaseTx) UserService {
	return &userService{dbTxAware{tx: tx, db: m.db}}
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

func (m *serviceManager) WithTx(f func(tx *persistence.DatabaseTx) error) error {
	return m.db.WithTx(f)
}

// postDBInit is called after the DB is initialised to finalise schema initialisation
func (m *serviceManager) postDBInit() error {
	// Initialise the config service
	m.dynCfgSvc = newDynConfigService(m.db)
	if err := m.dynCfgSvc.Load(); err != nil {
		return fmt.Errorf("failed to load configuration: %v", err)
	}

	// Reset any cached config
	m.domCfgCache.resetCache()

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
