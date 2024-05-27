package plugins

import (
	"fmt"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/extend"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/util"
	"net/http"
	"os"
	"path"
	"plugin"
	"strings"
)

// PluginManager is a service interface for managing plugins
type PluginManager interface {
	// Init initialises the manager
	Init() error
	// ServeHandler returns an HTTP handler for processing requests
	ServeHandler(next http.Handler) http.Handler
}

// logger represents a package-wide logger instance
var logger = logging.MustGetLogger("plugins")

// ThePluginManager is a global plugin manager instance
var ThePluginManager PluginManager = &pluginManager{
	plugs: map[string]extend.APIHandlerPlugin{},
}

//----------------------------------------------------------------------------------------------------------------------

// pluginManager is a blueprint PluginManager implementation
type pluginManager struct {
	plugs map[string]extend.APIHandlerPlugin // Map of loaded plugin implementations by the path served
}

func (pm *pluginManager) Init() error {
	// Don't bother if plugin dir not provided
	if config.ServerConfig.PluginPath == "" {
		logger.Info("Plugin directory isn't specified, not looking for plugins")
		return nil
	}

	// Scan for plugins
	if cnt, err := pm.scanDir(config.ServerConfig.PluginPath); err != nil {
		return err
	} else {
		logger.Infof("Loaded %d plugins", cnt)
	}

	// Succeeded
	return nil
}

func (pm *pluginManager) ServeHandler(next http.Handler) http.Handler {
	// Pass through if no plugins available
	if len(pm.plugs) == 0 {
		return next
	}

	// Make a new handler
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify the URL is a subpath of base
		if ok, p := config.ServerConfig.PathOfBaseURL(r.URL.Path); ok && strings.HasPrefix(p, util.APIPath) {
			// Iterate all plugins
			for pPath, plug := range pm.plugs {
				// If the plugin can handle this path
				if strings.HasPrefix(p, util.APIPath+pPath) {
					r.URL.Path = "/" + p
					plug.Handler().ServeHTTP(w, r)
					return
				}
			}
		}

		// Pass on to the next handler otherwise
		next.ServeHTTP(w, r)
	})
}

// scanDir scans the plugin directory recursively
func (pm *pluginManager) scanDir(dir string) (int, error) {
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
		plug, err := plugin.Open(fullPath)
		if err != nil {
			return 0, fmt.Errorf("failed to load plugin file %q: %w", fullPath, err)
		}

		// Look up the handler
		h, err := plug.Lookup("PluginImpl")
		if err != nil {
			return 0, fmt.Errorf("failed to obtain plugin implementation in file %q: %w", fullPath, err)
		}

		// Fetch the service interface (hPtr is a pointer, because Lookup always returns a pointer to symbol)
		hPtr, ok := h.(*extend.APIHandlerPlugin)
		if !ok {
			return 0, fmt.Errorf("symbol PluginImpl from plugin %q doesn't implement APIHandlerPlugin", fullPath)
		}

		// Store the implementation in the map
		cnt++
		pIntf := *hPtr
		pPath := strings.TrimSuffix(strings.TrimPrefix(pIntf.Path(), "/"), "/") + "/"
		logger.Infof("Loaded plugin library %s (serve path: %q)", fullPath, pPath)
		pm.plugs[pPath] = pIntf
	}

	// Succeeded
	return cnt, nil
}
