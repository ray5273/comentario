package svc

import (
	"fmt"
	"github.com/google/uuid"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/extend/intf"
	cplugin "gitlab.com/comentario/comentario/extend/plugin"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/persistence"
	"gitlab.com/comentario/comentario/internal/util"
	"iter"
	"net/http"
	"os"
	"path"
	"plugin"
	"strings"
)

// PluginManager is a service interface for managing plugins
type PluginManager interface {
	// Active returns whether the plugin manager is active (i.e. there's at least one plugin)
	Active() bool
	// ActivatePlugins activates every plugin
	ActivatePlugins(tx *persistence.DatabaseTx) error
	// HandleEvent passes the given event to available plugins, in order, until it's successfully handled or errored
	HandleEvent(event any, tx *persistence.DatabaseTx) error
	// Init the manager
	Init() error
	// PluginConfigs returns an iterator for each plugin's ID and configuration
	PluginConfigs() iter.Seq2[string, *cplugin.Config]
	// ServeHandler returns an HTTP handler for processing requests
	ServeHandler(next http.Handler) http.Handler
	// Shutdown the manager
	Shutdown(*persistence.DatabaseTx) error
}

//----------------------------------------------------------------------------------------------------------------------

// PluginConnector is a HostApp implementation aimed at a specific plugin instance
type PluginConnector interface {
	cplugin.HostApp
}

//----------------------------------------------------------------------------------------------------------------------

// pluginLogger is a Logger implementation
type pluginLogger struct {
	l *logging.Logger
}

func (p *pluginLogger) Error(args ...any) {
	p.l.Error(args...)
}

func (p *pluginLogger) Errorf(format string, args ...any) {
	p.l.Errorf(format, args...)
}

func (p *pluginLogger) Warning(args ...any) {
	p.l.Warning(args...)
}

func (p *pluginLogger) Warningf(format string, args ...any) {
	p.l.Warningf(format, args...)
}

func (p *pluginLogger) Info(args ...any) {
	p.l.Info(args...)
}

func (p *pluginLogger) Infof(format string, args ...any) {
	p.l.Infof(format, args...)
}

func (p *pluginLogger) Debug(args ...any) {
	p.l.Debug(args...)
}

func (p *pluginLogger) Debugf(format string, args ...any) {
	p.l.Debugf(format, args...)
}

//----------------------------------------------------------------------------------------------------------------------

// pluginConnector implements PluginConnector
type pluginConnector struct {
	id string // ID of the plugin the connector is created for
	px string // Prefix used for scoping domain/user stores
}

// newPluginConnector returns a new PluginConnector instance
func newPluginConnector(pluginID string) PluginConnector {
	return &pluginConnector{
		id: pluginID,
		px: pluginID + "/",
	}
}

func (c *pluginConnector) CreateTx() (intf.Tx, error) {
	return Services.CreateTx()
}

func (c *pluginConnector) AuthenticateBySessionCookie(value string) (*intf.User, error) {
	// Hand over to the cookie auth handler
	u, err := Services.AuthService(nil).AuthenticateUserByCookieHeader(value)
	if err != nil {
		return nil, err
	}
	return u.ToPluginUser(), nil
}

func (c *pluginConnector) Config() *cplugin.HostConfig {
	return &cplugin.HostConfig{
		BaseURL:       config.ServerConfig.ParsedBaseURL(),
		DefaultLangID: util.DefaultLanguage.String(),
	}
}

func (c *pluginConnector) CreateLogger(module string) cplugin.Logger {
	return &pluginLogger{l: logging.MustGetLogger(c.id + "." + module)}
}

func (c *pluginConnector) DomainAttrStore(tx intf.Tx) intf.AttrStore {
	return &pluginAttrStore{p: c.px, s: Services.DomainAttrService(castTx(tx))}
}

func (c *pluginConnector) UserAttrStore(tx intf.Tx) intf.AttrStore {
	return &pluginAttrStore{p: c.px, s: Services.UserAttrService(castTx(tx))}
}

func (c *pluginConnector) UserStore(tx intf.Tx) intf.UserStore {
	return &userStore{tx: castTx(tx)}
}

// castTx panics if the passed Tx is nil, casting it to DatabaseTx otherwise
func castTx(tx intf.Tx) *persistence.DatabaseTx {
	if tx == nil {
		panic("tx must not be nil")
	}
	return tx.(*persistence.DatabaseTx)
}

//----------------------------------------------------------------------------------------------------------------------

// pluginAttrStore is an AttrStore implementation scoped to a specific plugin
type pluginAttrStore struct {
	p string         // Prefix derived from the plugin ID
	s intf.AttrStore // Reference to the underlying store
}

func (as *pluginAttrStore) FindByAttrValue(key, value string) ([]uuid.UUID, error) {
	// Delegate to the underlying store, prefixing the key
	return as.s.FindByAttrValue(as.p+key, value)
}

func (as *pluginAttrStore) GetAll(ownerID *uuid.UUID) (intf.AttrValues, error) {
	// Delegate fetching to the underlying store
	av, err := as.s.GetAll(ownerID)
	if err != nil {
		return nil, err
	}

	// Filter by prefix
	r := intf.AttrValues{}
	pLen := len(as.p)
	for k, v := range av {
		if strings.HasPrefix(k, as.p) {
			// De-prefix the key
			r[k[pLen:]] = v
		}
	}
	return r, nil
}

func (as *pluginAttrStore) Set(ownerID *uuid.UUID, attr intf.AttrValues) error {
	// Prefix the keys
	av := intf.AttrValues{}
	for k, v := range attr {
		av[as.p+k] = v
	}

	// Delegate to the underlying store
	return as.s.Set(ownerID, av)
}

//----------------------------------------------------------------------------------------------------------------------

// userStore is an implementation of plugin.UserStore
type userStore struct {
	tx *persistence.DatabaseTx // Reference to the database transaction the store operates within
}

func (us *userStore) FindUserByID(id *uuid.UUID) (*intf.User, error) {
	if u, err := Services.UserService(us.tx).FindUserByID(id); err != nil {
		return nil, err
	} else {
		return u.ToPluginUser(), nil
	}
}

//----------------------------------------------------------------------------------------------------------------------

// pluginEntry groups a loaded plugin's info
type pluginEntry struct {
	id string                   // Unique plugin ID
	p  cplugin.ComentarioPlugin // Plugin implementation
	c  *cplugin.Config          // Configuration obtained from the plugin
}

// pluginManager is a blueprint PluginManager implementation
type pluginManager struct {
	plugs map[string]*pluginEntry // Map of loaded plugin entries by ID
}

// newPluginManager instantiates a new pluginManager
func newPluginManager() *pluginManager {
	return &pluginManager{
		plugs: map[string]*pluginEntry{},
	}
}

func (pm *pluginManager) Active() bool {
	return len(pm.plugs) > 0
}

func (pm *pluginManager) ActivatePlugins(tx *persistence.DatabaseTx) error {
	return pm.HandleEvent(&cplugin.ActivateEvent{}, tx)
}

func (pm *pluginManager) HandleEvent(event any, tx *persistence.DatabaseTx) error {
	// Iterate over plugins
	for _, pe := range pm.plugs {
		// Try to handle the event
		if err := pe.p.HandleEvent(event, tx); err != nil {
			// Event handling errored
			logger.Warningf("Plugin %q returned error while handling event %T: %v", pe.id, event, err)
			return err
		}
	}

	// Succeeded (or no plugins)
	return nil
}

func (pm *pluginManager) Init() error {
	// Don't bother if plugin dir not provided
	if config.ServerConfig.PluginPath == "" {
		logger.Info("Plugin directory isn't specified, not looking for plugins")
		return nil
	}

	// Scan for plugins
	if cnt, err := pm.scanDir(path.Clean(config.ServerConfig.PluginPath)); err != nil {
		return err
	} else if cnt == 0 {
		logger.Info("No plugins found")
	} else {
		logger.Infof("Loaded %d plugins", cnt)
	}

	// Succeeded
	return nil
}

func (pm *pluginManager) PluginConfigs() iter.Seq2[string, *cplugin.Config] {
	return func(yield func(string, *cplugin.Config) bool) {
		for _, pe := range pm.plugs {
			if !yield(pe.id, pe.c) {
				return
			}
		}
	}
}

func (pm *pluginManager) ServeHandler(next http.Handler) http.Handler {
	// Pass through if no plugins available
	if len(pm.plugs) == 0 {
		return next
	}

	// Make a new handler
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify the URL is a subpath of base
		if ok, p := config.ServerConfig.PathOfBaseURL(r.URL.Path); ok {
			// Check if it's a plugin API call
			if strings.HasPrefix(p, util.APIPath) {
				if pe := pm.findByPath(p, util.APIPath); pe != nil {
					pe.p.APIHandler().ServeHTTP(w, util.RequestReplacePath(r, p))
					return
				}
			}

			// Not an API call. Check if it's a statics request: resource can only be served via GET/HEAD/OPTIONS
			if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
				if pe := pm.findByPath(p, ""); pe != nil {
					pe.p.StaticHandler().ServeHTTP(w, util.RequestReplacePath(r, p))
					return
				}
			}
		}

		// Not handled, pass on to the next handler
		next.ServeHTTP(w, r)
	})
}

func (pm *pluginManager) Shutdown(tx *persistence.DatabaseTx) error {
	return pm.HandleEvent(&cplugin.ShutdownEvent{}, tx)
}

// findByPath returns a plugin whose path (with the optional prefix) starts the provided path, or nil if nothing found
func (pm *pluginManager) findByPath(requestPath, prefix string) *pluginEntry {
	for _, pe := range pm.plugs {
		// If the plugin can handle this path
		if strings.HasPrefix(requestPath, prefix+pe.c.Path+"/") {
			return pe
		}
	}
	return nil
}

// initPlugin initialises the given plugin and fetches its config
func (pm *pluginManager) initPlugin(p cplugin.ComentarioPlugin, secrets intf.YAMLDecoder) (*cplugin.Config, error) {
	// Initialise the plugin
	if err := p.Init(newPluginConnector(p.ID()), secrets); err != nil {
		return nil, err
	}

	// Fetch (a copy of) the config
	cfg := p.Config()

	// Correct the path by removing any leading and trailing slash
	cfg.Path = strings.Trim(cfg.Path, "/")
	return &cfg, nil
}

// loadPlugin loads a plugin lib and returns either a complete plugin entry, or nil if the plugin is explicitly disabled
func (pm *pluginManager) loadPlugin(filename string) (*pluginEntry, error) {
	// Try to load the plugin library
	plugLib, err := plugin.Open(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to load plugin file %q: %w", filename, err)
	}

	// Look up the implementation
	h, err := plugLib.Lookup("PluginImpl")
	if err != nil {
		return nil, fmt.Errorf("failed to find symbol PluginImpl in file %q: %w", filename, err)
	}

	// Fetch the service interface (hPtr is a pointer, because Lookup always returns a pointer to symbol)
	hPtr, ok := h.(*cplugin.ComentarioPlugin)
	if !ok {
		return nil, fmt.Errorf("symbol PluginImpl from plugin %q doesn't implement ComentarioPlugin", filename)
	}

	// Fetch plugin ID
	id := (*hPtr).ID()

	// Find the plugin's secrets config
	secConf := config.SecretsConfig.Plugins[id]

	// Check if the plugin is disabled
	var d config.Disableable
	if err := secConf.Decode(&d); err != nil {
		return nil, fmt.Errorf("error decoding secrets config for plugin %q: %w", filename, err)
	} else if d.Disable {
		// Plugin disabled
		return nil, nil
	}

	// Initialise the plugin
	cfg, err := pm.initPlugin(*hPtr, &secConf)
	if err != nil {
		return nil, fmt.Errorf("failed to initialise plugin %q: %w", filename, err)
	}

	// Succeeded
	return &pluginEntry{id: id, p: *hPtr, c: cfg}, nil
}

// scanDir scans the plugin directory recursively, loading every discovered plugin and returning the number of plugins
// found
func (pm *pluginManager) scanDir(dir string) (int, error) {
	logger.Debugf("Scanning directory %s", dir)

	// Scan the plugin dir
	files, err := os.ReadDir(dir)
	if err != nil {
		return 0, err
	}

	// Scan the plugins
	cnt := 0
	for _, file := range files {
		// Only consider .so files
		if !strings.HasSuffix(file.Name(), ".so") {
			continue
		}

		// Dive into directories
		fullPath := path.Join(dir, file.Name())
		if file.IsDir() {
			if i, err := pm.scanDir(fullPath); err != nil {
				return 0, err
			} else {
				cnt += i
			}
			continue
		}

		// Try to load the plugin
		pe, err := pm.loadPlugin(fullPath)
		if err != nil {
			return 0, err

		} else if pe == nil {
			// If a nil is returned, the plugin is explicitly disabled in secrets
			logger.Infof("Plugin library %s has been disabled in the secrets config", fullPath)
			continue
		}

		// Make sure the ID is unique
		if _, ok := pm.plugs[pe.id]; ok {
			return 0, fmt.Errorf("duplicate plugin ID %q returned by library %s", pe.id, fullPath)
		}

		// Store the implementation
		cnt++
		logger.Infof("Loaded plugin library %s (ID: %s, serve path: %q)", fullPath, pe.id, pe.c.Path)
		pm.plugs[pe.id] = pe
	}

	// Succeeded
	return cnt, nil
}
