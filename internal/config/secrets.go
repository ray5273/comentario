package config

import (
	"crypto/sha256"
	"errors"
	"fmt"
	"gitlab.com/comentario/comentario/internal/util"
	"gopkg.in/yaml.v3"
	"net"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
)

type SMTPEncryption string

const (
	SMTPEncryptionDefault SMTPEncryption = "" // Encryption will be chosen automatically based on the port number
	SMTPEncryptionNone    SMTPEncryption = "none"
	SMTPEncryptionSSL     SMTPEncryption = "ssl"
	SMTPEncryptionTLS     SMTPEncryption = "tls"
)

// SecretsConfig is a configuration object for storing sensitive information
var SecretsConfig = &SecretsConfiguration{}

// Disableable provides a flag for disabling the underlying functionality
type Disableable struct {
	Disable bool `yaml:"disable"` // Can be used to forcefully disable the corresponding functionality
}

// KeySecret is a record containing a key and a secret
type KeySecret struct {
	Disableable `yaml:",inline"`
	Key         string `yaml:"key"`    // Public key
	Secret      string `yaml:"secret"` // Private key
}

// Usable returns whether the instance isn't disabled and the key and the secret are filled in
func (c *KeySecret) Usable() bool {
	return !c.Disable && c.Key != "" && c.Secret != ""
}

// APIKey is a record containing an API key
type APIKey struct {
	Disableable `yaml:",inline"`
	Key         string `yaml:"key"` // API key
}

// OIDCProvider stores OIDC provider configuration
type OIDCProvider struct {
	KeySecret `yaml:",inline"`
	ID        string   `yaml:"id"`     // Unique provider ID, e.g. "keycloak"
	Name      string   `yaml:"name"`   // Provider display name, e.g. "Keycloak"
	URL       string   `yaml:"url"`    // OIDC server URL
	Scopes    []string `yaml:"scopes"` // Additional scopes to request
}

// QualifiedID returns the provider's ID prepended with the common OIDC prefix
func (p *OIDCProvider) QualifiedID() string {
	return "oidc:" + p.ID
}

var reOIDCProviderID = regexp.MustCompile(`^[-a-z0-9]{1,32}$`)

// validate the OIDC provider configuration
func (p *OIDCProvider) validate() error {
	// Don't bother if it's disabled
	if p.Disable {
		return nil
	}

	// KeySecret
	if !p.Usable() {
		return errors.New("both provider key and secret must be specified")
	}

	// ID
	switch {
	case p.ID == "":
		return errors.New("provider ID must be specified")
	case len(p.ID) > 32:
		return fmt.Errorf("provider ID cannot exceed 32 characters (%d supplied)", len(p.ID))
	case !reOIDCProviderID.MatchString(p.ID):
		return errors.New("provider ID must consist of lowercase characters, digits, and dashes only")
	}

	// Name
	if p.Name == "" {
		return errors.New("provider name must be specified")
	}

	// Discovery URL
	if p.URL == "" {
		return errors.New("provider server URL must be specified")
	} else if !util.IsValidURL(p.URL, false) {
		return errors.New("invalid provider server URL")
	}
	return nil
}

// PostgresConfig describes PostgreSQL settings. Used when at least host is provided
type PostgresConfig struct {
	Host           string `yaml:"host"`        // Host
	Port           int    `yaml:"port"`        // Port
	Username       string `yaml:"username"`    // Username
	Password       string `yaml:"password"`    // Password
	Database       string `yaml:"database"`    // Database
	ConnectTimeout int    `yaml:"connTimeout"` // Maximum wait for connection, in seconds. Zero or not specified means wait indefinitely
	SSLMode        string `yaml:"sslMode"`     // SSL mode, defaults to "disable"
	SSLModeLegacy  string `yaml:"sslmode"`     // Legacy SSL mode key provided for backward compatibility
	SSLCert        string `yaml:"sslCert"`     // Cert file location
	SSLKey         string `yaml:"sslKey"`      // Key file location
	SSLRootCert    string `yaml:"sslRootCert"` // Root certificate file location
}

// ConnectString returns database connect string, optionally masking the password
func (c *PostgresConfig) ConnectString(mask bool) string {
	// Port number
	port := c.Port
	if port == 0 {
		port = 5432 // PostgreSQL default
	}

	// SSL Mode
	sslMode := c.SSLMode
	if sslMode == "" {
		sslMode = c.SSLModeLegacy
	}
	if sslMode == "" {
		sslMode = "disable"
	}

	// Prepare query params
	q := make(url.Values)
	if c.ConnectTimeout > 0 {
		q.Set("connect_timeout", strconv.Itoa(c.ConnectTimeout))
	}
	q.Set("sslmode", sslMode)
	if c.SSLCert != "" {
		q.Set("sslcert", c.SSLCert)
	}
	if c.SSLKey != "" {
		q.Set("sslkey", c.SSLKey)
	}
	if c.SSLRootCert != "" {
		q.Set("sslrootcert", c.SSLRootCert)
	}

	// Prepare a URL
	u := url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(c.Username, util.If(mask, "REDACTED", c.Password)),
		Host:     net.JoinHostPort(c.Host, strconv.Itoa(port)),
		Path:     c.Database,
		RawQuery: q.Encode(),
	}
	return u.String()
}

// enabled indicates if PostgreSQL is enabled
func (c *PostgresConfig) enabled() bool {
	return c.Host != ""
}

// validate the configuration
func (c *PostgresConfig) validate() error {
	var e []string
	if c.Host == "" {
		e = append(e, "host is not specified")
	}
	if c.Database == "" {
		e = append(e, "DB name is not specified")
	}
	if c.Username == "" {
		e = append(e, "username is not specified")
	}
	if c.Password == "" {
		e = append(e, "password is not specified")
	}
	if len(e) > 0 {
		return fmt.Errorf("PostgreSQL database misconfigured: %s", strings.Join(e, "; "))
	}
	return nil
}

// SQLite3Config describes SQLite3 settings
type SQLite3Config struct {
	File string `yaml:"file"` // Location of the database file
}

// ConnectString returns database connect string
func (c *SQLite3Config) ConnectString() string {
	// Enable the enforcement of foreign keys
	return fmt.Sprintf("%s?_fk=true", c.File)
}

// enabled indicates if SQLite3 is enabled
func (c *SQLite3Config) enabled() bool {
	return c.File != ""
}

// validate the configuration
func (c *SQLite3Config) validate() error {
	// Check file is specified
	if c.File == "" {
		return errors.New("SQLite3 database misconfigured: file is not specified")
	}

	// Check file exists (not an error)
	if _, err := os.Stat(c.File); os.IsNotExist(err) {
		logger.Warningf("SQLite3 database file %q does not exist, will create one", c.File)
	}
	return nil
}

// SMTPServerConfig describes SMTP server settings
type SMTPServerConfig struct {
	Host       string         `yaml:"host"`       // SMTP server hostname
	Port       int            `yaml:"port"`       // SMTP server port
	User       string         `yaml:"username"`   // SMTP server username
	Pass       string         `yaml:"password"`   // SMTP server password
	Encryption SMTPEncryption `yaml:"encryption"` // Encryption used for sending mails
	Insecure   bool           `yaml:"insecure"`   // Skip SMTP server certificate verification
}

// MailerSettings returns derived mailer configuration parameters
func (c *SMTPServerConfig) MailerSettings() (port int, useSSL, useTLS bool) {
	// Default port value is for STARTTLS
	port = c.Port
	if port == 0 {
		port = 587
	}

	// Figure out encryption params
	switch c.Encryption {
	case SMTPEncryptionNone:
		// Do nothing
	case SMTPEncryptionDefault:
		useSSL, useTLS = port == 465, port == 587
	case SMTPEncryptionSSL:
		useSSL = true
	case SMTPEncryptionTLS:
		useTLS = true
	}
	return
}

// enabled indicates if SMTP is enabled
func (c *SMTPServerConfig) enabled() bool {
	return c.Host != ""
}

// validate the configuration
func (c *SMTPServerConfig) validate() error {
	if c.Host == "" {
		logger.Warning("SMTP host isn't provided, sending emails is not available")
		return nil
	}

	// Issue a notification if no credentials are provided
	if c.User == "" {
		logger.Info("SMTP username isn't provided, no SMTP authentication will be used")
	} else if c.Pass == "" {
		logger.Warning("SMTP password isn't provided")
	}

	// Validate encryption
	switch c.Encryption {
	case SMTPEncryptionNone, SMTPEncryptionDefault, SMTPEncryptionSSL, SMTPEncryptionTLS:
		// Valid
	default:
		return fmt.Errorf("invalid SMTP encryption: %q", c.Encryption)
	}

	// Succeeded
	return nil
}

// FederatedIdPConfig describes federated identity providers settings
type FederatedIdPConfig struct {
	Facebook KeySecret      `yaml:"facebook"` // Facebook auth config
	GitHub   KeySecret      `yaml:"github"`   // GitHub auth config
	GitLab   KeySecret      `yaml:"gitlab"`   // GitLab auth config
	Google   KeySecret      `yaml:"google"`   // Google auth config
	Twitter  KeySecret      `yaml:"twitter"`  // Twitter auth config
	OIDC     []OIDCProvider `yaml:"oidc"`     // OIDC provider specs
}

// validate the configuration
func (c *FederatedIdPConfig) validate() error {
	// Iterate all available OIDC entries
	ids := map[string]bool{}
	for _, p := range c.OIDC {
		// Validate the config
		if err := p.validate(); err != nil {
			return fmt.Errorf("invalid OIDC provider (ID=%q) config: %w", p.ID, err)
		}

		// Make sure the ID is unique
		if ids[p.ID] {
			return fmt.Errorf("duplicate OIDC provider ID: %q", p.ID)
		}
		ids[p.ID] = true
	}

	// Succeeded
	return nil
}

// ExtensionsConfig describes Comentario extensions settings
type ExtensionsConfig struct {
	Akismet             APIKey `yaml:"akismet"`
	Perspective         APIKey `yaml:"perspective"`
	APILayerSpamChecker APIKey `yaml:"apiLayerSpamChecker"`
}

// SecretsConfiguration accumulates the entire configuration provided in a secrets file
type SecretsConfiguration struct {
	Postgres   PostgresConfig       `yaml:"postgres"`   // PostgreSQL config
	SQLite3    SQLite3Config        `yaml:"sqlite3"`    // SQLite3 config
	SMTPServer SMTPServerConfig     `yaml:"smtpServer"` // SMTP server config
	IdP        FederatedIdPConfig   `yaml:"idp"`        // Federated identity provider config
	Extensions ExtensionsConfig     `yaml:"extensions"` // Extensions config
	XSRFSecret string               `yaml:"xsrfSecret"` // Optional random string to generate XSRF key from
	Plugins    map[string]yaml.Node `yaml:"plugins"`    // Optional plugin config, a map indexed by plugin ID. Gets read as raw YAML nodes

	xsrfKey []byte // The generated XSRF key for the server
}

// PostProcess signals the configuration the values have been assigned
func (sc *SecretsConfiguration) PostProcess() error {
	// Validate the config
	if err := sc.validate(); err != nil {
		return err
	}

	// Hash the XSRF secret if it's provided and use that as the key
	var err error
	if sc.XSRFSecret != "" {
		x := sha256.Sum256([]byte(sc.XSRFSecret))
		sc.xsrfKey = x[:]

		// Generate a random XSRF key otherwise
	} else if sc.xsrfKey, err = util.RandomBytes(32); err != nil {
		return err
	}

	// Succeeded
	return nil
}

// XSRFKey returns the XSRF key for the server
func (sc *SecretsConfiguration) XSRFKey() []byte {
	return sc.xsrfKey
}

// validate the configuration
func (sc *SecretsConfiguration) validate() error {
	// Validate DB configuration
	switch {
	// PostgreSQL
	case sc.Postgres.enabled():
		if err := sc.Postgres.validate(); err != nil {
			return err
		}

	// SQLite3
	case sc.SQLite3.enabled():
		if err := sc.SQLite3.validate(); err != nil {
			return err
		}

	// Failed to identify DB dialect
	default:
		return errors.New("could not determine DB dialect to use. Either postgres.host or sqlite3.file must be set")
	}

	// Validate mailer and identity providers
	return util.CheckErrors(
		sc.SMTPServer.validate(),
		sc.IdP.validate())
}
