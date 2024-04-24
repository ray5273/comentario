package config

import (
	"embed"
	"encoding/json"
	"fmt"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/util"
	"gopkg.in/yaml.v3"
	"net/url"
	"os"
	"strings"
	"time"
)

var (
	AppVersion string    // Application version set during bootstrapping
	BuildDate  time.Time // Application build date set during bootstrapping
)

var (
	// logger represents a package-wide logger instance
	logger = logging.MustGetLogger("config")

	// CLIFlags stores command-line flags
	CLIFlags = struct {
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
	}{}

	// Derived values

	BaseURL           *url.URL // The parsed base URL
	CDNURL            *url.URL // The parsed CDN URL
	UseHTTPS          bool     // Whether the base URL is an HTTPS one
	XSRFKey           []byte   // The XSRF key for the server
	TermsOfServiceURL string   // Terms of Service page URL
	PrivacyPolicyURL  string   // Privacy Policy page URL

	I18nFS *embed.FS // Embedded translations linked to during bootstrapping
)

// CLIParsed is a callback that signals the config the CLI flags have been parsed
func CLIParsed() error {
	// Log the currently used config
	jc, _ := json.MarshalIndent(CLIFlags, "", "    ")
	logger.Infof("Using configuration:\n%s", jc)

	// Parse the base URL
	var err error
	if BaseURL, err = util.ParseAbsoluteURL(CLIFlags.BaseURL, true, true); err != nil {
		return fmt.Errorf("invalid Base URL: %v", err)
	}
	UseHTTPS = BaseURL.Scheme == "https"

	// Validate the base docs URL
	if !util.IsValidURL(CLIFlags.BaseDocsURL, true) {
		return fmt.Errorf("invalid Base Docs URL: %q", CLIFlags.BaseDocsURL)
	}

	// Process ToS URL
	TermsOfServiceURL = CLIFlags.TermsOfServiceURL
	if TermsOfServiceURL == "" {
		TermsOfServiceURL = strings.TrimSuffix(CLIFlags.BaseDocsURL, "/") + "/en/legal/tos/"
	} else if !util.IsValidURL(TermsOfServiceURL, true) {
		return fmt.Errorf("invalid Terms of Service page URL: %q", TermsOfServiceURL)
	}

	// Process Privacy Policy URL
	PrivacyPolicyURL = CLIFlags.PrivacyPolicyURL
	if PrivacyPolicyURL == "" {
		PrivacyPolicyURL = strings.TrimSuffix(CLIFlags.BaseDocsURL, "/") + "/en/legal/privacy/"
	} else if !util.IsValidURL(PrivacyPolicyURL, true) {
		return fmt.Errorf("invalid Privacy Policy page URL: %q", PrivacyPolicyURL)
	}

	// Check the CDN URL: if it's empty, use the base URL instead
	if CLIFlags.CDNURL == "" {
		CDNURL = BaseURL

	} else if CDNURL, err = util.ParseAbsoluteURL(CLIFlags.CDNURL, true, true); err != nil {
		return fmt.Errorf("invalid CDN URL: %v", err)
	}

	// Load secrets
	if err := UnmarshalConfigFile(CLIFlags.SecretsFile, SecretsConfig); err != nil {
		return err
	}

	// Generate a random XSRF key
	if XSRFKey, err = util.RandomBytes(32); err != nil {
		return err
	}

	// Configure OAuth providers
	oauthConfigure()

	// Configure mailer
	if err := configureMailer(); err != nil {
		return err
	}

	// Succeeded
	return nil
}

// MaskIP hides a part of the given IPv4/IPv6 address if full IP logging isn't enabled, otherwise returns the IP as-is
func MaskIP(ip string) string {
	if !CLIFlags.LogFullIPs {
		// Find the second dot
		idx := 0
		for i, c := range ip {
			if c == '.' {
				idx++
				if idx == 2 {
					// Second dot found, replace the rest of the string
					return ip[:i] + ".x.x"
				}
			} else if c == ':' {
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

// PathOfBaseURL returns whether the given path is under the Base URL's path, and the path part relative to the base
// path (omitting the leading '/', if any)
func PathOfBaseURL(path string) (bool, string) {
	if strings.HasPrefix(path, BaseURL.Path) {
		return true, strings.TrimPrefix(path[len(BaseURL.Path):], "/")
	}
	return false, ""
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

// URLFor returns the complete absolute URL for the given path, with optional query params
func URLFor(path string, queryParams map[string]string) string {
	u := url.URL{
		Scheme: BaseURL.Scheme,
		Host:   BaseURL.Host,
		Path:   strings.TrimSuffix(BaseURL.Path, "/") + "/" + strings.TrimPrefix(path, "/"),
	}
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
func URLForAPI(path string, queryParams map[string]string) string {
	return URLFor(util.APIPath+strings.TrimPrefix(path, "/"), queryParams)
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

	// Create a mailer
	util.TheMailer = util.NewSMTPMailer(
		cfg.Host,
		cfg.Port,
		cfg.User,
		cfg.Pass,
		util.If(CLIFlags.EmailFrom == "", cfg.User, CLIFlags.EmailFrom),
		cfg.Insecure,
		useSSL,
		useTLS)
	logger.Infof("SMTP configured with server %s:%d%s", cfg.Host, cfg.Port, util.If(cfg.Insecure, " (INSECURE)", ""))
	return nil
}
