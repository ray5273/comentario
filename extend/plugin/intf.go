package plugin

import (
	"github.com/google/uuid"
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
	AuthenticateBySessionCookie(value string) (Principal, error)
	// CreateLogger creates and returns a logger used for logging plugin messages
	CreateLogger(module string) Logger
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
	UIPLugLocationNavbarMenu UIPlugLocation = "navbar.menu"
	UIPLugLocationFooterMenu UIPlugLocation = "footer.menu"
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
	Path         string         // Path the plug's component will be available at
}

// Config describes plugin configuration
// Warning: Unstable API
type Config struct {
	Path        string       // Path the plugin's handlers are invoked on
	UIResources []UIResource // UI resources to be loaded for the plugin
	UIPlugs     []UIPlug     // UI plugs
}

// YAMLDecoder allows for unmarshalling configuration into a user-defined structure, which provides `yaml` metadata
type YAMLDecoder interface {
	Decode(target any) error
}

// ComentarioPlugin describes a plugin that handles API and static HTTP calls
// Warning: Unstable API
type ComentarioPlugin interface {
	// ID returns a unique plugin identifier
	ID() string
	// Init initialises the plugin, supplying it with a host reference and an optional secrets config decoder
	Init(host HostApp, secretsDecoder YAMLDecoder) error
	// Config should return the plugin's configuration
	Config() Config
	// APIHandler returns a handler that processes API calls relevant to the plugin. Each HTTP request passed to the
	// handler will have a path conforming "<base_path>/api/<plugin_path>[/<subpath>]"
	APIHandler() http.Handler
	// StaticHandler returns a handler that serves static content relevant to the plugin. Each HTTP request passed to
	// the handler will have a path conforming "<base_path>/<plugin_path>[/<subpath>]"
	StaticHandler() http.Handler
}

// Principal represents an authenticated user
type Principal interface {
	// GetID returns the unique user ID
	GetID() uuid.UUID
	// GetEmail returns the unique user email
	GetEmail() string
	// GetName returns the user's full name
	GetName() string
}
