package plugin

import (
	"gitlab.com/comentario/comentario/extend/intf"
	"net/http"
)

// Logger represents a logger provided to plugins
type Logger interface {
	// Error logs a error message
	Error(args ...any)
	// Errorf logs a formatted error message
	Errorf(format string, args ...any)
	// Warning logs a warning message
	Warning(args ...any)
	// Warningf logs a formatted warning message
	Warningf(format string, args ...any)
	// Info logs a info message
	Info(args ...any)
	// Infof logs a formatted info message
	Infof(format string, args ...any)
	// Debug logs a debug message
	Debug(args ...any)
	// Debugf logs a formatted debug message
	Debugf(format string, args ...any)
}

// HostApp represents the host application, which hosts plugins
type HostApp interface {
	// AuthenticateBySessionCookie authenticates a principal given a session cookie value
	AuthenticateBySessionCookie(value string) (*intf.User, error)
	// Config is the host configuration
	Config() *HostConfig
	// CreateLogger creates and returns a logger used for logging plugin messages
	CreateLogger(module string) Logger
	// CreateTx creates and returns a new database transaction
	CreateTx() (intf.Tx, error)
	// DomainAttrStore returns an instance of the domain attributes store for the plugin
	DomainAttrStore(tx intf.Tx) intf.AttrStore
	// UserAttrStore returns an instance of the user attributes store for the plugin
	UserAttrStore(tx intf.Tx) intf.AttrStore
	// UserStore returns an instance of the user store
	UserStore(tx intf.Tx) intf.UserStore
}

// UIResource describes a UI resource required by the plugin
type UIResource struct {
	Type string // Resource type
	URL  string // Resource URL, relative to "<base_path>/<plugin_path>"
	Rel  string // Relationship to the host document
}

// UIPlugLocation denotes a plug's location in the UI
type UIPlugLocation string

//goland:noinspection GoUnusedConst
const (
	UIPLugLocationNavbarMenu  UIPlugLocation = "navbar.menu"
	UIPLugLocationFooterMenu  UIPlugLocation = "footer.menu"
	UIPLugLocationUserProfile UIPlugLocation = "profile"
)

// UILabel provides a label displayed in the UI for a specific language
type UILabel struct {
	Language string // Language tag
	Text     string // Label text
}

// UIPlug specifies a UI plug, i.e. a visual element that gets injected in the frontend
// Warning: Unstable API
type UIPlug struct {
	Location     UIPlugLocation // Where to plug the specified component
	Labels       []UILabel      // Plug labels, provided at least for the default UI language ("en")
	ComponentTag string         // HTML tag of the component to plug
	Path         string         // Path the plug's component will be available at. Only required for "standalone" components available on a path
}

// MessageEntry combines a message file path and content
type MessageEntry struct {
	Path    string // Message file path, which provides language specification
	Content []byte // Message file content
}

// Config describes plugin configuration
// Warning: Unstable API
type Config struct {
	Path          string         // Path the plugin's handlers are invoked on
	UIResources   []UIResource   // UI resources to be loaded for the plugin
	UIPlugs       []UIPlug       // UI plugs
	Messages      []MessageEntry // Plugin messages
	XSRFSafePaths []string       // API endpoint path prefixes to exclude from XSRF protection (for methods other than GET/HEAD/OPTIONS), relative to plugin API root (may contain leading "/")
}

// ComentarioPlugin describes a plugin that handles API and static HTTP calls
// Warning: Unstable API
type ComentarioPlugin interface {
	// ID returns a unique plugin identifier
	ID() string
	// Init initialises the plugin, supplying it with a host reference and an optional secrets config decoder
	Init(host HostApp, secretsDecoder intf.YAMLDecoder) error
	// Config should return the plugin's configuration
	Config() Config
	// APIHandler returns a handler that processes API calls relevant to the plugin. Each HTTP request passed to the
	// handler will have a path conforming "<base_path>/api/<plugin_path>[/<subpath>]"
	APIHandler() http.Handler
	// StaticHandler returns a handler that serves static content relevant to the plugin. Each HTTP request passed to
	// the handler will have a path conforming "<base_path>/<plugin_path>[/<subpath>]"
	StaticHandler() http.Handler
	// HandleEvent notifies the plugin of a certain event, which is always passed as a pointer, also providing a
	// transaction, which must be used for all database operations in the context of this event. The plugin can modify
	// the passed event's payload as necessary
	HandleEvent(event any, tx intf.Tx) error
}
