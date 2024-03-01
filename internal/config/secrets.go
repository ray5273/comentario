package config

type SMTPEncryption string

const (
	SMTPEncryptionDefault SMTPEncryption = "" // Encryption will be chosen automatically based on the port number
	SMTPEncryptionNone    SMTPEncryption = "none"
	SMTPEncryptionSSL     SMTPEncryption = "ssl"
	SMTPEncryptionTLS     SMTPEncryption = "tls"
)

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

// SecretsConfig is a configuration object for storing sensitive information
var SecretsConfig = &struct {
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
}{}
