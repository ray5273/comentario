// Models used to interact plugins.
// WARNING: unstable API

package plugin

import (
	"net/url"
)

// HostConfig provides access to the host app configuration
type HostConfig struct {
	BaseURL       *url.URL // Base Comentario URL
	DefaultLangID string   // Default interface language ID
}
