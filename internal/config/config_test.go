package config

import (
	"fmt"
	"gitlab.com/comentario/comentario/internal/util"
	"net/http"
	"net/url"
	"testing"
)

func mustParseURL(s string) *url.URL {
	if u, err := url.Parse(s); err != nil {
		panic(err)
	} else {
		return u
	}
}

func TestServerConfiguration_PathOfBaseURL(t *testing.T) {
	tests := []struct {
		name     string
		baseURL  string
		path     string
		wantOK   bool
		wantPath string
	}{
		{"domain root, empty        ", "http://api.test/", "", false, ""},
		{"domain root, root         ", "http://api.test/", "/", true, ""},
		{"subpath, empty            ", "http://api.test/some/path", "", false, ""},
		{"subpath, root             ", "http://api.test/some/path", "/", false, ""},
		{"subpath, same path, with /", "http://api.test/some/path", "/some/path", true, ""},
		{"subpath, same path, no /  ", "http://api.test/some/path", "some/path", false, ""},
		{"subpath, deep path, with /", "http://api.test/some/path", "/some/path/subpath", true, "subpath"},
		{"subpath, deep path, no /  ", "http://api.test/some/path", "some/path/subpath", false, ""},
	}
	for _, tt := range tests {
		sc := ServerConfiguration{parsedBaseURL: mustParseURL(tt.baseURL)}
		t.Run(tt.name, func(t *testing.T) {
			gotOK, gotPath := sc.PathOfBaseURL(tt.path)
			if gotOK != tt.wantOK {
				t.Errorf("PathOfBaseURL() got OK = %v, want %v", gotOK, tt.wantOK)
			}
			if gotPath != tt.wantPath {
				t.Errorf("PathOfBaseURL() got path = %v, want %v", gotPath, tt.wantPath)
			}
		})
	}
}

func TestServerConfiguration_URLFor(t *testing.T) {
	tests := []struct {
		name        string
		base        string
		path        string
		queryParams map[string]string
		want        string
	}{
		{"Root, no params ", "http://ace.of.base:1234", "", nil, "http://ace.of.base:1234/"},
		{"Root with params", "http://basics/", "", map[string]string{"foo": "bar"}, "http://basics/?foo=bar"},
		{"Path, no params ", "https://microsoft.qq:14/", "user/must/suffer", nil, "https://microsoft.qq:14/user/must/suffer"},
		{"Path with params", "https://yellow/submarine", "strawberry/fields", map[string]string{"baz": "   "}, "https://yellow/submarine/strawberry/fields?baz=+++"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sc := ServerConfiguration{parsedBaseURL: mustParseURL(tt.base)}
			if got := sc.URLFor(tt.path, tt.queryParams); got != tt.want {
				t.Errorf("URLFor() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestServerConfiguration_URLForAPI(t *testing.T) {
	tests := []struct {
		name        string
		base        string
		path        string
		queryParams map[string]string
		want        string
	}{
		{"Root, no params ", "http://ace.of.base:1234", "", nil, "http://ace.of.base:1234/api/"},
		{"Root with params", "http://basics/", "", map[string]string{"foo": "bar"}, "http://basics/api/?foo=bar"},
		{"Path, no params ", "https://microsoft.qq:14/", "user/must/suffer", nil, "https://microsoft.qq:14/api/user/must/suffer"},
		{"Path with params", "https://yellow/submarine", "strawberry/fields", map[string]string{"baz": "   "}, "https://yellow/submarine/api/strawberry/fields?baz=+++"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sc := ServerConfiguration{parsedBaseURL: mustParseURL(tt.base)}
			if got := sc.URLForAPI(tt.path, tt.queryParams); got != tt.want {
				t.Errorf("URLForAPI() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsXSRFSafe(t *testing.T) {
	base := "http://foo.bar"
	tests := []struct {
		reqMethod string
		reqPath   string
		want      bool
	}{
		// GET not under base URL
		{"GET", "/baz", false},
		{"GET", "/android-chrome-192x192.png", false},
		{"GET", "/android-chrome-512x512.png", false},
		{"GET", "/apple-touch-icon.png", false},
		{"GET", "/browserconfig.xml", false},
		{"GET", "/favicon.ico", false},
		{"GET", "/favicon-16x16.png", false},
		{"GET", "/favicon-32x32.png", false},
		{"GET", "/icon-rss-64px.png", false},
		{"GET", "/mstile-70x70.png", false},
		{"GET", "/mstile-144x144.png", false},
		{"GET", "/mstile-150x150.png", false},
		{"GET", "/mstile-310x150.png", false},
		{"GET", "/mstile-310x310.png", false},
		{"GET", "/robots.txt", false},
		{"GET", "/safari-pinned-tab.svg", false},
		{"GET", "/site.webmanifest", false},
		{"GET", "/comentario.js", false},
		{"GET", "/comentario.css", false},
		// Valid method, not under base URL
		{"HEAD", "/site.webmanifest", false},
		{"HEAD", "/comentario.js", false},
		{"OPTIONS", "/comentario.css", false},
		// Invalid method, under base URL
		{"POST", "/cc/android-chrome-192x192.png", false},
		{"PUT", "/cc/android-chrome-512x512.png", false},
		{"PATCH", "/cc/apple-touch-icon.png", false},
		{"DELETE", "/cc/browserconfig.xml", false},
		// Valid method under base URL
		{"GET", "/cc/baz", false},
		{"GET", "/cc/android-chrome-192x192.png", true},
		{"GET", "/cc/android-chrome-512x512.png", true},
		{"GET", "/cc/apple-touch-icon.png", true},
		{"GET", "/cc/browserconfig.xml", true},
		{"GET", "/cc/favicon.ico", true},
		{"GET", "/cc/favicon-16x16.png", true},
		{"GET", "/cc/favicon-32x32.png", true},
		{"GET", "/cc/icon-rss-64px.png", true},
		{"GET", "/cc/mstile-70x70.png", true},
		{"GET", "/cc/mstile-144x144.png", true},
		{"GET", "/cc/mstile-150x150.png", true},
		{"GET", "/cc/mstile-310x150.png", true},
		{"GET", "/cc/mstile-310x310.png", true},
		{"GET", "/cc/robots.txt", true},
		{"GET", "/cc/safari-pinned-tab.svg", true},
		{"GET", "/cc/site.webmanifest", true},
		{"GET", "/cc/comentario.js", true},
		{"GET", "/cc/comentario.css", true},
		{"HEAD", "/cc/site.webmanifest", true},
		{"HEAD", "/cc/comentario.js", true},
		{"OPTIONS", "/cc/comentario.css", true},
		// XSRF-safe paths, not under base URL
		{"GET", "/api/embed/", false},
		{"GET", "/en/fonts/", false},
		{"GET", "/en/images/", false},
		{"POST", "/api/embed/", false},
		{"POST", "/en/fonts/", false},
		{"POST", "/en/images/", false},
		// XSRF-safe paths, under base URL
		{"GET", "/cc/api/embed/", true},
		{"GET", "/cc/en/fonts/", true},
		{"GET", "/cc/en/images/", true},
		{"POST", "/cc/api/embed/", true},
		{"POST", "/cc/en/fonts/", true},
		{"POST", "/cc/en/images/", true},
		{"PUT", "/cc/api/embed/foo/42", true},
		{"PUT", "/cc/en/fonts/foo/42", true},
		{"PUT", "/cc/en/images/foo/42", true},
	}
	ServerConfig = ServerConfiguration{parsedBaseURL: mustParseURL(base + "/cc")}
	for _, tt := range tests {
		t.Run(fmt.Sprintf("%s %s", tt.reqMethod, tt.reqPath), func(t *testing.T) {
			r := &http.Request{Method: tt.reqMethod, URL: mustParseURL(base + tt.reqPath)}
			if got := IsXSRFSafe(r); got != tt.want {
				t.Errorf("IsXSRFSafe() = %v, want %v", got, tt.want)
			}
		})
	}
}

type stubMailer struct{}

func (m *stubMailer) Operational() bool                                    { return false }
func (m *stubMailer) Mail(string, string, string, string, ...string) error { return nil }

func Test_configureMailer(t *testing.T) {
	tests := []struct {
		name           string
		emailFrom      string
		smtpHost       string
		smtpPort       int
		smtpUser       string
		smtpPass       string
		smtpEncryption SMTPEncryption
		smtpInsecure   bool
		errText        string
		wantMailerOp   bool
	}{
		{"no SMTP config  + no email       ", "", "", 0, "", "", SMTPEncryptionDefault, false, "", false},
		{"host only       + no email       ", "", "foo.bar", 0, "", "", SMTPEncryptionNone, false, `invalid 'From' email address "": mail: no address`, false},
		{"unknown encryption               ", "foo@bar", "foo.bar", 0, "", "", "brute", false, "", true},
		{"host only       + bad email      ", "brick", "foo.bar", 0, "", "", SMTPEncryptionSSL, false, `invalid 'From' email address "brick": mail: missing '@' or angle-addr`, false},
		{"host only       + good email     ", "foo@bar", "foo.bar", 0, "", "", SMTPEncryptionTLS, false, "", true},
		{"host only       + good email/name", "Goblin <foo@bar>", "foo.bar", 0, "", "", SMTPEncryptionNone, false, "", true},
		{"complete SMTP   + no email       ", "", "foo.bar", 465, "username", "password", SMTPEncryptionDefault, false, `invalid 'From' email address "": mail: no address`, false},
		{"complete SMTP   + bad email      ", "ouchie", "mail.host.com", 587, "username", "password", SMTPEncryptionDefault, false, `invalid 'From' email address "ouchie": mail: missing '@' or angle-addr`, false},
		{"complete SMTP   + good email     ", "ben@kenobi.org", "mail.host.com", 587, "username", "password", SMTPEncryptionDefault, false, "", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Init configs
			util.TheMailer = &stubMailer{}
			ServerConfig.EmailFrom = tt.emailFrom
			SecretsConfig.SMTPServer.Host = tt.smtpHost
			SecretsConfig.SMTPServer.Port = tt.smtpPort
			SecretsConfig.SMTPServer.User = tt.smtpUser
			SecretsConfig.SMTPServer.Pass = tt.smtpPass
			SecretsConfig.SMTPServer.Encryption = tt.smtpEncryption
			SecretsConfig.SMTPServer.Insecure = tt.smtpInsecure

			// Run and check for error
			if err := configureMailer(); err == nil && tt.errText != "" {
				t.Errorf("configureMailer() no error, wanted error %s", tt.errText)
			} else if err != nil && tt.errText == "" {
				t.Errorf("configureMailer() error = %v, wanted no error", err)
			} else if err != nil && err.Error() != tt.errText {
				t.Errorf("configureMailer() error = %q, wanted %q", err, tt.errText)
			}

			// Check the mailer
			if mo := util.TheMailer.Operational(); mo != tt.wantMailerOp {
				t.Errorf("TheMailer.Operational = %v, wanted %v", mo, tt.wantMailerOp)
			}
		})
	}
}
