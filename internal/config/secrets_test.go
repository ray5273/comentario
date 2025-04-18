package config

import (
	"net/url"
	"reflect"
	"strings"
	"testing"
)

func TestKeySecret_Usable(t *testing.T) {
	tests := []struct {
		name    string
		disable bool
		key     string
		secret  string
		want    bool
	}{
		{"all empty              ", false, "", "", false},
		{"disabled, values empty ", true, "", "", false},
		{"enabled, key only      ", false, "SomeValue", "", false},
		{"enabled, secret only   ", false, "", "SomeValue", false},
		{"enabled, values filled ", false, "XYZ", "ABC", true},
		{"disabled, values filled", true, "XYZ", "ABC", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &KeySecret{Disableable: Disableable{tt.disable}, Key: tt.key, Secret: tt.secret}
			if got := c.Usable(); got != tt.want {
				t.Errorf("Usable() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestOIDCProvider_QualifiedID(t *testing.T) {
	tests := []struct {
		name string
		id   string
		want string
	}{
		{"empty", "", "oidc:"},
		{"facebook", "facebook", "oidc:facebook"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := &OIDCProvider{ID: tt.id}
			if got := p.QualifiedID(); got != tt.want {
				t.Errorf("QualifiedID() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestOIDCProvider_validate(t *testing.T) {
	ksDisabled := &KeySecret{Disableable: Disableable{Disable: true}}
	ksValid := &KeySecret{Key: "key123", Secret: "secret567"}
	tests := []struct {
		name string
		cfg  OIDCProvider
		err  string
	}{
		{"empty           ", OIDCProvider{}, "both provider key and secret must be specified"},
		{"disabled        ", OIDCProvider{KeySecret: *ksDisabled}, ""},
		{"key/secret only ", OIDCProvider{KeySecret: *ksValid}, "provider ID must be specified"},
		{"id only         ", OIDCProvider{ID: "foo"}, "both provider key and secret must be specified"},
		{"id too long     ", OIDCProvider{KeySecret: *ksValid, ID: "too-long-because-max-32ch-allowed"}, "provider ID cannot exceed 32 characters (33 supplied)"},
		{"id with _       ", OIDCProvider{KeySecret: *ksValid, ID: "fancy_id"}, "provider ID must consist of lowercase characters, digits, and dashes only"},
		{"id with cap char", OIDCProvider{KeySecret: *ksValid, ID: "someID"}, "provider ID must consist of lowercase characters, digits, and dashes only"},
		{"id with symbol  ", OIDCProvider{KeySecret: *ksValid, ID: "id!"}, "provider ID must consist of lowercase characters, digits, and dashes only"},
		{"no name         ", OIDCProvider{KeySecret: *ksValid, ID: "hoho"}, "provider name must be specified"},
		{"no URL          ", OIDCProvider{KeySecret: *ksValid, ID: "hoho", Name: "bar"}, "provider server URL must be specified"},
		{"bad URL         ", OIDCProvider{KeySecret: *ksValid, ID: "hoho", Name: "bar", URL: "this isn't a valid URL"}, "invalid provider server URL"},
		{"insecure URL    ", OIDCProvider{KeySecret: *ksValid, ID: "hoho", Name: "bar", URL: "http://foo.bar"}, "invalid provider server URL"},
		{"valid           ", OIDCProvider{KeySecret: *ksValid, ID: "this-id-is-exactly-32-chars-long", Name: "bar", URL: "https://foo.bar"}, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := tt.cfg
			if err := c.validate(); (err != nil) != (tt.err != "") {
				t.Errorf("validate() has error = %v, want %v", err != nil, tt.err != "")
			} else if err != nil && err.Error() != tt.err {
				t.Errorf("validate() error = %q, want %q", err, tt.err)
			}
		})
	}
}

func TestPostgresConfig_ConnectString(t *testing.T) {
	tests := []struct {
		name      string
		cfg       PostgresConfig
		mask      bool
		wantURL   string
		wantQuery url.Values
	}{
		{"empty, no mask", PostgresConfig{}, false, "postgres://:@:5432", url.Values{"sslmode": []string{"disable"}}},
		{"empty, mask   ", PostgresConfig{}, true, "postgres://:REDACTED@:5432", url.Values{"sslmode": []string{"disable"}}},
		{
			"defaults, no mask",
			PostgresConfig{Host: "here", Username: "user", Password: "secret", Database: "db"},
			false,
			"postgres://user:secret@here:5432/db",
			url.Values{"sslmode": []string{"disable"}},
		},
		{
			"defaults, with mask",
			PostgresConfig{Host: "here", Username: "user", Password: "secret", Database: "db"},
			true,
			"postgres://user:REDACTED@here:5432/db",
			url.Values{"sslmode": []string{"disable"}},
		},
		{
			"complete, no mask",
			PostgresConfig{
				Host:           "localhost",
				Port:           128,
				Username:       "user",
				Password:       "secret",
				Database:       "comentario",
				ConnectTimeout: 517,
				SSLMode:        "verify-full",
				SSLCert:        "./cert.pem",
				SSLKey:         "./key.pem",
				SSLRootCert:    "./ca.pem",
			},
			false,
			"postgres://user:secret@localhost:128/comentario",
			url.Values{
				"sslmode":         []string{"verify-full"},
				"sslcert":         []string{"./cert.pem"},
				"sslkey":          []string{"./key.pem"},
				"sslrootcert":     []string{"./ca.pem"},
				"connect_timeout": []string{"517"},
			},
		},
		{
			"complete, with mask",
			PostgresConfig{
				Host:           "localhost",
				Port:           128,
				Username:       "user",
				Password:       "secret",
				Database:       "comentario",
				ConnectTimeout: 517,
				SSLMode:        "verify-full",
				SSLCert:        "./cert.pem",
				SSLKey:         "./key.pem",
				SSLRootCert:    "./ca.pem",
			},
			true,
			"postgres://user:REDACTED@localhost:128/comentario",
			url.Values{
				"sslmode":         []string{"verify-full"},
				"sslcert":         []string{"./cert.pem"},
				"sslkey":          []string{"./key.pem"},
				"sslrootcert":     []string{"./ca.pem"},
				"connect_timeout": []string{"517"},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := tt.cfg
			got := c.ConnectString(tt.mask)

			// Compare the URL without the query first
			if cs := strings.SplitN(got, "?", 2); cs[0] != tt.wantURL {
				t.Errorf("ConnectString() URL = %v, want %v", cs[0], tt.wantURL)

				// Next, compare the query params: it's a map so the order is indeterminate
			} else if qp, err := url.ParseQuery(cs[1]); err != nil {
				t.Errorf("ConnectString() parsing query params failed: %v", err)
			} else if !reflect.DeepEqual(qp, tt.wantQuery) {
				t.Errorf("ConnectString() QueryParams = %#v, want %#v", qp, tt.wantQuery)
			}
		})
	}
}

func TestPostgresConfig_enabled(t *testing.T) {
	tests := []struct {
		name string
		host string
		want bool
	}{
		{"no host  ", "", false},
		{"with host", "foobar", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &PostgresConfig{Host: tt.host}
			if got := c.enabled(); got != tt.want {
				t.Errorf("enabled() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPostgresConfig_validate(t *testing.T) {
	tests := []struct {
		name string
		cfg  PostgresConfig
		err  string
	}{
		{"empty            ", PostgresConfig{}, "PostgreSQL database misconfigured: host is not specified; DB name is not specified; username is not specified; password is not specified"},
		{"host only        ", PostgresConfig{Host: "foo"}, "PostgreSQL database misconfigured: DB name is not specified; username is not specified; password is not specified"},
		{"database only    ", PostgresConfig{Database: "foo"}, "PostgreSQL database misconfigured: host is not specified; username is not specified; password is not specified"},
		{"username only    ", PostgresConfig{Username: "foo"}, "PostgreSQL database misconfigured: host is not specified; DB name is not specified; password is not specified"},
		{"password only    ", PostgresConfig{Password: "foo"}, "PostgreSQL database misconfigured: host is not specified; DB name is not specified; username is not specified"},
		{"username/password", PostgresConfig{Username: "foo", Password: "bar"}, "PostgreSQL database misconfigured: host is not specified; DB name is not specified"},
		{"valid config     ", PostgresConfig{Host: "host", Database: "db", Username: "foo", Password: "bar"}, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := tt.cfg
			if err := c.validate(); (err != nil) != (tt.err != "") {
				t.Errorf("validate() has error = %v, want %v", err != nil, tt.err != "")
			} else if err != nil && err.Error() != tt.err {
				t.Errorf("validate() error = %q, want %q", err, tt.err)
			}
		})
	}
}

func TestSQLite3Config_ConnectString(t *testing.T) {
	tests := []struct {
		name string
		cfg  SQLite3Config
		want string
	}{
		{"empty   ", SQLite3Config{}, "?_fk=true"},
		{"complete", SQLite3Config{File: "/usr/share/whatever.sqlite"}, "/usr/share/whatever.sqlite?_fk=true"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := tt.cfg
			if got := c.ConnectString(); got != tt.want {
				t.Errorf("ConnectString() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestSQLite3Config_enabled(t *testing.T) {
	tests := []struct {
		name string
		file string
		want bool
	}{
		{"no file  ", "", false},
		{"with file", "C:/foobar", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &SQLite3Config{File: tt.file}
			if got := c.enabled(); got != tt.want {
				t.Errorf("enabled() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestSQLite3Config_validate(t *testing.T) {
	tests := []struct {
		name string
		cfg  SQLite3Config
		err  string
	}{
		{"empty    ", SQLite3Config{}, "SQLite3 database misconfigured: file is not specified"},
		{"with file", SQLite3Config{File: "foo"}, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := tt.cfg
			if err := c.validate(); (err != nil) != (tt.err != "") {
				t.Errorf("validate() has error = %v, want %v", err != nil, tt.err != "")
			} else if err != nil && err.Error() != tt.err {
				t.Errorf("validate() error = %q, want %q", err, tt.err)
			}
		})
	}
}

func TestSMTPServerConfig_MailerSettings(t *testing.T) {
	tests := []struct {
		name       string
		cfg        SMTPServerConfig
		wantPort   int
		wantUseSSL bool
		wantUseTLS bool
	}{
		{"defaults           ", SMTPServerConfig{}, 587, false, true},
		{"custom port        ", SMTPServerConfig{Port: 422}, 422, false, false},
		{"custom port + none ", SMTPServerConfig{Port: 424, Encryption: "none"}, 424, false, false},
		{"custom port + SSL  ", SMTPServerConfig{Port: 425, Encryption: "ssl"}, 425, true, false},
		{"custom port + TLS  ", SMTPServerConfig{Port: 477, Encryption: "tls"}, 477, false, true},
		{"default port + none", SMTPServerConfig{Encryption: "none"}, 587, false, false},
		{"default port + SSL ", SMTPServerConfig{Encryption: "ssl"}, 587, true, false},
		{"default port + TLS ", SMTPServerConfig{Encryption: "tls"}, 587, false, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := tt.cfg
			gotPort, gotUseSSL, gotUseTLS := c.MailerSettings()
			if gotPort != tt.wantPort {
				t.Errorf("MailerSettings() gotPort = %v, want %v", gotPort, tt.wantPort)
			}
			if gotUseSSL != tt.wantUseSSL {
				t.Errorf("MailerSettings() gotUseSSL = %v, want %v", gotUseSSL, tt.wantUseSSL)
			}
			if gotUseTLS != tt.wantUseTLS {
				t.Errorf("MailerSettings() gotUseTLS = %v, want %v", gotUseTLS, tt.wantUseTLS)
			}
		})
	}
}

func TestSMTPServerConfig_enabled(t *testing.T) {
	tests := []struct {
		name string
		host string
		want bool
	}{
		{"no host  ", "", false},
		{"with host", "foobar", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &SMTPServerConfig{Host: tt.host}
			if got := c.enabled(); got != tt.want {
				t.Errorf("enabled() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestSMTPServerConfig_validate(t *testing.T) {
	tests := []struct {
		name string
		cfg  SMTPServerConfig
		err  string
	}{
		{"empty             ", SMTPServerConfig{}, ""},
		{"host only         ", SMTPServerConfig{Host: "foo"}, ""},
		{"host only         ", SMTPServerConfig{Host: "foo"}, ""},
		{"host + user       ", SMTPServerConfig{Host: "foo", User: "john"}, ""},
		{"host + credentials", SMTPServerConfig{Host: "foo", User: "john", Pass: "ouch"}, ""},
		{"bad encryption    ", SMTPServerConfig{Host: "foo", Encryption: "foul"}, `invalid SMTP encryption: "foul"`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := tt.cfg
			if err := c.validate(); (err != nil) != (tt.err != "") {
				t.Errorf("validate() has error = %v, want %v", err != nil, tt.err != "")
			} else if err != nil && err.Error() != tt.err {
				t.Errorf("validate() error = %q, want %q", err, tt.err)
			}
		})
	}
}

func TestFederatedIdPConfig_validate(t *testing.T) {
	ksValid := &KeySecret{Key: "key", Secret: "secret"}
	oidcDisabled := &OIDCProvider{KeySecret: KeySecret{Disableable: Disableable{Disable: true}}, ID: "foo"}
	oidcIDMissing := &OIDCProvider{KeySecret: *ksValid}
	oidcIDLong := &OIDCProvider{KeySecret: *ksValid, ID: "too-long-because-max-32ch-allowed"}
	oidcIDInvalid := &OIDCProvider{KeySecret: *ksValid, ID: "ah-oh-BAD"}
	tests := []struct {
		name string
		oidc []OIDCProvider
		err  string
	}{
		{"empty              ", nil, ""},
		{"disabled           ", []OIDCProvider{*oidcDisabled}, ""},
		{"disabled, duplicate", []OIDCProvider{*oidcDisabled, *oidcDisabled}, `duplicate OIDC provider ID: "foo"`},
		{"missing ID         ", []OIDCProvider{*oidcIDMissing}, `invalid OIDC provider (ID="") config: provider ID must be specified`},
		{"too long ID        ", []OIDCProvider{*oidcIDLong}, `invalid OIDC provider (ID="too-long-because-max-32ch-allowed") config: provider ID cannot exceed 32 characters (33 supplied)`},
		{"invalid ID         ", []OIDCProvider{*oidcIDInvalid}, `invalid OIDC provider (ID="ah-oh-BAD") config: provider ID must consist of lowercase characters, digits, and dashes only`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := FederatedIdPConfig{OIDC: tt.oidc}
			if err := c.validate(); (err != nil) != (tt.err != "") {
				t.Errorf("validate() has error = %v, want %v", err != nil, tt.err != "")
			} else if err != nil && err.Error() != tt.err {
				t.Errorf("validate() error = %q, want %q", err, tt.err)
			}
		})
	}
}
