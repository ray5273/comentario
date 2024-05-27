package extend

import "net/http"

// APIHandlerPlugin describes a plugin that handles API endpoints
// NB: Unstable API
type APIHandlerPlugin interface {
	// Handler should return a handler that processes API calls relevant to the plugin
	Handler() http.Handler
	// Path should return the root path the handler is invoked on
	Path() string
}
