package extend

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

// ComentarioPluginHost represents the host application, which hosts plugins
type ComentarioPluginHost interface {
	// AuthenticateBySessionCookie authenticates a principal given a session cookie value
	AuthenticateBySessionCookie(value string) (Principal, error)
	// CreateLogger creates and returns a logger used for logging plugin messages
	CreateLogger(module string) Logger
}

// ComentarioPluginUIResource describes a UI resource required by the plugin
type ComentarioPluginUIResource struct {
	Type string // Resource type
	URL  string // Resource URL, relative to "<base_path>/<plugin_path>"
	Rel  string // Relationship to the host document
}

// ComentarioPluginUIPlug specifies a UI plug
// Warning: Unstable API
type ComentarioPluginUIPlug struct {
	Location     string // Where to plug the specified component
	Label        string // Plug label
	ComponentTag string // HTML tag of the component to plug
}

// ComentarioPluginConfig describes plugin configuration
// Warning: Unstable API
type ComentarioPluginConfig struct {
	ID          string                       // Unique plugin identifier
	Path        string                       // Path the plugin's handlers are invoked on
	UIResources []ComentarioPluginUIResource // UI resources to be loaded for the plugin
	UIPlugs     []ComentarioPluginUIPlug     // UI plugs
}

// ComentarioPlugin describes a plugin that handles API and static HTTP calls
// Warning: Unstable API
type ComentarioPlugin interface {
	// Init initialises the plugin, supplying it with a host reference
	Init(host ComentarioPluginHost) error
	// Config should return the plugin's configuration
	Config() ComentarioPluginConfig
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
