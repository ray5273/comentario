package config

type SMTPEncryption string

const (
	SMTPEncryptionDefault SMTPEncryption = "" // Encryption will be chosen automatically based on the port number
	SMTPEncryptionNone    SMTPEncryption = "none"
	SMTPEncryptionSSL     SMTPEncryption = "ssl"
	SMTPEncryptionTLS     SMTPEncryption = "tls"
)

// SecretsConfig is a configuration object for storing sensitive information
var SecretsConfig = &struct {
	Postgres struct {
		Host     string `yaml:"host"`     // PostgreSQL host
		Port     int    `yaml:"port"`     // PostgreSQL port
		Username string `yaml:"username"` // PostgreSQL username
		Password string `yaml:"password"` // PostgreSQL password
		Database string `yaml:"database"` // PostgreSQL database
		SSLMode  string `yaml:"sslmode"`  // PostgreSQL sslmode, defaults to "disable"
	} `yaml:"postgres"`

	SMTPServer struct {
		Host       string         `yaml:"host"`       // SMTP server hostname
		Port       int            `yaml:"port"`       // SMTP server port
		User       string         `yaml:"username"`   // SMTP server username
		Pass       string         `yaml:"password"`   // SMTP server password
		Encryption SMTPEncryption `yaml:"encryption"` // Encryption used for sending mails
		Insecure   bool           `yaml:"insecure"`   // Skip SMTP server certificate verification
	} `yaml:"smtpServer"`

	IdP struct {
		Facebook KeySecret `yaml:"facebook"` // Facebook auth config
		GitHub   KeySecret `yaml:"github"`   // GitHub auth config
		GitLab   KeySecret `yaml:"gitlab"`   // GitLab auth config
		Google   KeySecret `yaml:"google"`   // Google auth config
		LinkedIn KeySecret `yaml:"linkedin"` // LinkedIn auth config
		Twitter  KeySecret `yaml:"twitter"`  // Twitter auth config
	} `yaml:"idp"`

	Akismet struct {
		Key string `yaml:"key"` // Akismet key
	} `yaml:"akismet"`
}{}
