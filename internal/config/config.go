package config

import (
	"embed"
	"encoding/json"
	"fmt"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/util"
	"gopkg.in/yaml.v3"
	"net/http"
	"net/mail"
	"net/url"
	"os"
	"strings"
)

// ServerConfiguration stores Comentario server configuration
type ServerConfiguration struct {
	// Flags
	Verbose           []bool `short:"v" long:"verbose"  description:"Verbose logging (-vv for debug)"`
	NoLogColours      bool   `long:"no-color"           description:"Disable log colouring"                                                            env:"NO_COLOR"`
	BaseURL           string `long:"base-url"           description:"Server's own base URL"                      default:"http://localhost:8080"       env:"BASE_URL"`
	BaseDocsURL       string `long:"base-docs-url"      description:"Base documentation URL"                     default:"https://docs.comentario.app" env:"BASE_DOCS_URL"`
	TermsOfServiceURL string `long:"tos-url"            description:"URL of the Terms of Service page"           default:""                            env:"TOS_URL"`
	PrivacyPolicyURL  string `long:"privacy-policy-url" description:"URL of the Privacy Policy page"             default:""                            env:"PRIVACY_POLICY_URL"`
	CDNURL            string `long:"cdn-url"            description:"Static file CDN URL (defaults to base URL)" default:""                            env:"CDN_URL"`
	EmailFrom         string `long:"email-from"         description:"'From' address in sent emails, defaults to SMTP username"                         env:"EMAIL_FROM"`
	DBIdleConns       int    `long:"db-idle-conns"      description:"Max. # of idle DB connections"              default:"50"                          env:"DB_MAX_IDLE_CONNS"`
	DisableXSRF       bool   `long:"disable-xsrf"       description:"Disable XSRF protection (development purposes only)"`
	EnableSwaggerUI   bool   `long:"enable-swagger-ui"  description:"Enable Swagger UI at /api/docs"`
	PluginPath        string `long:"plugin-path"        description:"Path to plugins"                            default:""                            env:"PLUGIN_PATH"`
	StaticPath        string `long:"static-path"        description:"Path to static files"                       default:"./frontend"                  env:"STATIC_PATH"`
	DBMigrationPath   string `long:"db-migration-path"  description:"Path to DB migration files"                 default:"./db"                        env:"DB_MIGRATION_PATH"`
	DBDebug           bool   `long:"db-debug"           description:"Enable database debug logging"`
	TemplatePath      string `long:"template-path"      description:"Path to template files"                     default:"./templates"                 env:"TEMPLATE_PATH"`
	SecretsFile       string `long:"secrets"            description:"Path to YAML file with secrets"             default:"secrets.yaml"                env:"SECRETS_FILE"`
	Superuser         string `long:"superuser"          description:"ID or email of user to be made superuser"   default:""                            env:"SUPERUSER"`
	LogFullIPs        bool   `long:"log-full-ips"       description:"Log IP addresses in full"                                                         env:"LOG_FULL_IPS"`
	HomeContentURL    string `long:"home-content-url"   description:"URL of a HTML page to display on homepage"                                        env:"HOME_CONTENT_URL"`
	GitLabURL         string `long:"gitlab-url"         description:"Custom GitLab URL for authentication"       default:""                            env:"GITLAB_URL"`
	DisableLiveUpdate bool   `long:"no-live-update"     description:"Disable live updates via WebSockets"                                              env:"NO_LIVE_UPDATE"`
	WSMaxClients      uint32 `long:"ws-max-clients"     description:"Maximum number of WebSocket clients"        default:"10000"                       env:"WS_MAX_CLIENTS"`
	E2e               bool   `long:"e2e"                description:"End-2-end testing mode"`

	parsedBaseURL *url.URL // The parsed base URL
	parsedCDNURL  *url.URL // The parsed CDN URL
	useHTTPS      bool     // Whether the base URL is an HTTPS one
}

var (
	logger       = logging.MustGetLogger("config") // Package-wide logger instance
	ServerConfig = ServerConfiguration{}           // Server configuration derived from the command-line switches and environment vars
	I18nFS       *embed.FS                         // Embedded translations linked to during bootstrapping
)

// ParsedBaseURL returns the parsed base URL
func (sc *ServerConfiguration) ParsedBaseURL() *url.URL {
	return sc.parsedBaseURL
}

// ParsedCDNURL returns the parsed CDN URL
func (sc *ServerConfiguration) ParsedCDNURL() *url.URL {
	return sc.parsedCDNURL
}

// PathOfBaseURL returns whether the given path is under the Base URL's path, and the path part relative to the base
// path (omitting the leading '/', if any)
func (sc *ServerConfiguration) PathOfBaseURL(path string) (bool, string) {
	if strings.HasPrefix(path, sc.parsedBaseURL.Path) {
		return true, strings.TrimPrefix(path[len(sc.parsedBaseURL.Path):], "/")
	}
	return false, ""
}

// URLFor returns the complete absolute URL for the given path, with optional query params
func (sc *ServerConfiguration) URLFor(path string, queryParams map[string]string) string {
	if path == "" {
		path = "/"
	}
	u := sc.parsedBaseURL.JoinPath(path)
	if queryParams != nil {
		q := url.Values{}
		for k, v := range queryParams {
			q.Set(k, v)
		}
		u.RawQuery = q.Encode()
	}
	return u.String()
}

// URLForAPI returns the complete absolute URL for the given API path, with optional query params
func (sc *ServerConfiguration) URLForAPI(path string, queryParams map[string]string) string {
	return sc.URLFor(util.APIPath+strings.TrimPrefix(path, "/"), queryParams)
}

// UseHTTPS returns whether the base URL is an HTTPS one
func (sc *ServerConfiguration) UseHTTPS() bool {
	return sc.useHTTPS
}

// postProcess signals the config the CLI flags have been parsed and assigned values
func (sc *ServerConfiguration) postProcess() error {
	// Log the currently used config
	jc, _ := json.MarshalIndent(sc, "", "    ")
	logger.Infof("Using configuration:\n%s", jc)

	// Parse the base URL
	var err error
	if sc.parsedBaseURL, err = util.ParseAbsoluteURL(sc.BaseURL, true, true); err != nil {
		return fmt.Errorf("invalid Base URL: %w", err)
	}
	sc.useHTTPS = sc.parsedBaseURL.Scheme == "https"

	// Validate the base docs URL
	if !util.IsValidURL(sc.BaseDocsURL, true) {
		return fmt.Errorf("invalid Base Docs URL: %q", sc.BaseDocsURL)
	}

	// Process ToS URL
	if sc.TermsOfServiceURL == "" {
		sc.TermsOfServiceURL = strings.TrimSuffix(sc.BaseDocsURL, "/") + "/en/legal/tos/"
	} else if !util.IsValidURL(sc.TermsOfServiceURL, true) {
		return fmt.Errorf("invalid Terms of Service page URL: %q", sc.TermsOfServiceURL)
	}

	// Process Privacy Policy URL
	if sc.PrivacyPolicyURL == "" {
		sc.PrivacyPolicyURL = strings.TrimSuffix(sc.BaseDocsURL, "/") + "/en/legal/privacy/"
	} else if !util.IsValidURL(sc.PrivacyPolicyURL, true) {
		return fmt.Errorf("invalid Privacy Policy page URL: %q", sc.PrivacyPolicyURL)
	}

	// Check the CDN URL: if it's empty, use the base URL instead
	if sc.CDNURL == "" {
		sc.parsedCDNURL = sc.parsedBaseURL

	} else if sc.parsedCDNURL, err = util.ParseAbsoluteURL(sc.CDNURL, true, true); err != nil {
		return fmt.Errorf("invalid CDN URL: %w", err)
	}

	// Load and post-process secrets
	if err := UnmarshalConfigFile(sc.SecretsFile, SecretsConfig); err != nil {
		return err
	} else if err := SecretsConfig.PostProcess(); err != nil {
		return err
	}

	// From email address defaults to SMTP username. It will be validated during SMTP mailer setup
	if sc.EmailFrom == "" {
		sc.EmailFrom = SecretsConfig.SMTPServer.User
	}

	// Succeeded
	return nil
}

//----------------------------------------------------------------------------------------------------------------------

// IsXSRFSafe returns whether the given request is "XSRF-safe"
func IsXSRFSafe(r *http.Request) bool {
	// Only handle requests mapping to a path under the base
	if ok, p := ServerConfig.PathOfBaseURL(r.URL.Path); ok {
		// Safe if it's a GET/HEAD/OPTIONS <static resource>
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			if _, static := util.UIStaticPaths[p]; static {
				return true
			}
		}

		// Safe if it's a known "safe path"
		return util.XSRFSafePaths.Has(p)
	}

	// (Potentially) not safe
	return false
}

// MaskIP hides a part of the given IPv4/IPv6 address if full IP logging isn't enabled, otherwise returns the IP as-is
func MaskIP(ip string) string {
	if !ServerConfig.LogFullIPs {
		// Find the second dot
		idx := 0
		for i, c := range ip {
			switch c {
			case '.':
				idx++
				if idx == 2 {
					// Second dot found, replace the rest of the string
					return ip[:i] + ".x.x"
				}

			case ':':
				idx++
				if idx == 2 {
					// Second colon found, replace the rest of the string
					return ip[:i] + ":x:x:x:x:x:x"
				}
			}
		}
	}
	return ip
}

// PostProcess signals the config the CLI flags have been parsed and assigned values
func PostProcess() error {
	if err := ServerConfig.postProcess(); err != nil {
		return err
	}

	// Configure OAuth providers
	if err := oauthConfigure(); err != nil {
		return err
	}

	// Configure mailer
	if err := configureMailer(); err != nil {
		return err
	}

	// Succeeded
	return nil
}

// UnmarshalConfigFile reads in the specified YAML file at the specified path and unmarshalls it into the given variable
func UnmarshalConfigFile(filename string, out any) error {
	// Read in the file
	data, err := os.ReadFile(filename)
	if err != nil {
		return err
	}

	// Unmarshal the data
	return yaml.Unmarshal(data, out)
}

func configureMailer() error {
	// If SMTP host is available, use a corresponding mailer
	cfg := &SecretsConfig.SMTPServer
	if cfg.Host == "" {
		logger.Warning("SMTP host isn't provided, sending emails is not available")
		return nil
	}

	// Issue a notification if no credentials are provided
	if cfg.User == "" {
		logger.Info("SMTP username isn't provided, no SMTP authentication will be used")
	} else if cfg.Pass == "" {
		logger.Warning("SMTP password isn't provided")
	}

	// Default port value is for STARTTLS
	if cfg.Port == 0 {
		cfg.Port = 587
	}

	// Figure out encryption params
	useSSL, useTLS := false, false
	switch cfg.Encryption {
	case SMTPEncryptionNone:
		// Do nothing
	case SMTPEncryptionDefault:
		useSSL, useTLS = cfg.Port == 465, cfg.Port == 587
	case SMTPEncryptionSSL:
		useSSL = true
	case SMTPEncryptionTLS:
		useTLS = true
	default:
		return fmt.Errorf("invalid SMTP encryption: %q", cfg.Encryption)
	}

	// Validate the From email address
	if _, err := mail.ParseAddress(ServerConfig.EmailFrom); err != nil {
		return fmt.Errorf("invalid 'From' email address %q: %w", ServerConfig.EmailFrom, err)
	}

	// Create a mailer
	util.TheMailer = util.NewSMTPMailer(
		cfg.Host,
		cfg.Port,
		cfg.User,
		cfg.Pass,
		ServerConfig.EmailFrom,
		cfg.Insecure,
		useSSL,
		useTLS)
	logger.Infof("SMTP configured with server %s:%d%s", cfg.Host, cfg.Port, util.If(cfg.Insecure, " (INSECURE)", ""))
	return nil
}
