package config

import (
	"crypto/sha256"
	"errors"
	"fmt"
	"gitlab.com/comentario/comentario/internal/util"
	"os"
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

// KeySecret is a record containing a key and a secret
type KeySecret struct {
	Disable bool   `yaml:"disable"` // Can be used to forcefully disable the corresponding functionality
	Key     string `yaml:"key"`     // Public key
	Secret  string `yaml:"secret"`  // Private key
}

// Usable returns whether the instance isn't disabled and the key and the secret are filled in
func (c *KeySecret) Usable() bool {
	return !c.Disable && c.Key != "" && c.Secret != ""
}

// APIKey is a record containing an API key
type APIKey struct {
	Disable bool   `yaml:"disable"` // Can be used to forcefully disable the corresponding functionality
	Key     string `yaml:"key"`     // API key
}

type SecretsConfiguration struct {
	// PostgreSQL settings. Used when at least host is provided
	Postgres struct {
		Host     string `yaml:"host"`     // PostgreSQL host
		Port     int    `yaml:"port"`     // PostgreSQL port
		Username string `yaml:"username"` // PostgreSQL username
		Password string `yaml:"password"` // PostgreSQL password
		Database string `yaml:"database"` // PostgreSQL database
		SSLMode  string `yaml:"sslmode"`  // PostgreSQL sslmode, defaults to "disable"
	} `yaml:"postgres"`

	// SQLite3 settings. Used if PostgreSQL settings are omitted
	SQLite3 struct {
		File string `yaml:"file"` // Location of the database file
	} `yaml:"sqlite3"`

	// SMTP server settings
	SMTPServer struct {
		Host       string         `yaml:"host"`       // SMTP server hostname
		Port       int            `yaml:"port"`       // SMTP server port
		User       string         `yaml:"username"`   // SMTP server username
		Pass       string         `yaml:"password"`   // SMTP server password
		Encryption SMTPEncryption `yaml:"encryption"` // Encryption used for sending mails
		Insecure   bool           `yaml:"insecure"`   // Skip SMTP server certificate verification
	} `yaml:"smtpServer"`

	// Federated identity provider settings
	IdP struct {
		Facebook KeySecret `yaml:"facebook"` // Facebook auth config
		GitHub   KeySecret `yaml:"github"`   // GitHub auth config
		GitLab   KeySecret `yaml:"gitlab"`   // GitLab auth config
		Google   KeySecret `yaml:"google"`   // Google auth config
		LinkedIn KeySecret `yaml:"linkedin"` // LinkedIn auth config
		Twitter  KeySecret `yaml:"twitter"`  // Twitter auth config
	} `yaml:"idp"`

	// Extension settings
	Extensions struct {
		Akismet             APIKey `yaml:"akismet"`
		Perspective         APIKey `yaml:"perspective"`
		APILayerSpamChecker APIKey `yaml:"apiLayerSpamChecker"`
	} `yaml:"extensions"`

	// Optional random string to generate XSRF key from
	XSRFSecret string `yaml:"xsrfSecret"`

	xsrfKey []byte // The generated XSRF key for the server
}

// PostProcess signals the configuration the values have been assigned
func (sc *SecretsConfiguration) PostProcess() error {
	// Validate the config
	if err := sc.validate(); err != nil {
		return err
	}

	// Generate a random XSRF key if no secret is provided
	if sc.XSRFSecret == "" {
		var err error
		if sc.xsrfKey, err = util.RandomBytes(32); err != nil {
			return err
		}
	}

	// Hash the secret otherwise
	x := sha256.Sum256([]byte(sc.XSRFSecret))
	sc.xsrfKey = x[:]

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
	case sc.Postgres.Host != "":
		if err := sc.validatePostgresConfig(); err != nil {
			return err
		}

	// SQLite3
	case sc.SQLite3.File != "":
		if err := sc.validateSQLite3Config(); err != nil {
			return err
		}

	// Failed to identify DB dialect
	default:
		return errors.New("could not determine DB dialect to use. Either postgres.host or sqlite3.file must be set")
	}
	return nil
}

// validatePostgresConfig verifies the PostgreSQL database configuration is valid
func (sc *SecretsConfiguration) validatePostgresConfig() error {
	var e []string
	if sc.Postgres.Host == "" {
		e = append(e, "host is not specified")
	}
	if sc.Postgres.Port == 0 {
		sc.Postgres.Port = 5432 // PostgreSQL default
	}
	if sc.Postgres.Database == "" {
		e = append(e, "DB name is not specified")
	}
	if sc.Postgres.Username == "" {
		e = append(e, "username is not specified")
	}
	if sc.Postgres.Password == "" {
		e = append(e, "password is not specified")
	}
	if sc.Postgres.SSLMode == "" {
		sc.Postgres.SSLMode = "disable"
	}
	if len(e) > 0 {
		return fmt.Errorf("PostgreSQL database misconfigured: %s", strings.Join(e, "; "))
	}
	return nil
}

// validateSQLite3Config verifies the SQLite3 database configuration is valid
func (sc *SecretsConfiguration) validateSQLite3Config() error {
	// Check file is specified
	if sc.SQLite3.File == "" {
		return errors.New("SQLite3 database misconfigured: file is not specified")
	}

	// Check file exists (not an error)
	if _, err := os.Stat(sc.SQLite3.File); os.IsNotExist(err) {
		logger.Warningf("SQLite3 database file %q does not exist, will create one", sc.SQLite3.File)
	}
	return nil
}
