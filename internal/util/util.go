package util

import (
	"archive/zip"
	"bytes"
	"compress/gzip"
	"crypto/hmac"
	cryptorand "crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"github.com/avct/uasurfer"
	"github.com/microcosm-cc/bluemonday"
	"github.com/op/go-logging"
	"github.com/phuslu/iploc"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	gmhtml "github.com/yuin/goldmark/renderer/html"
	"gitlab.com/comentario/comentario/internal/intf"
	"golang.org/x/net/html"
	"io"
	"math/rand"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

// logger represents a package-wide logger instance
var logger = logging.MustGetLogger("persistence")

var (
	reIPLike         = regexp.MustCompile(`^\d+\.\d+\.\d+\.\d+$`)
	reDNSHostname    = regexp.MustCompile(`^([a-z\d][-a-z\d]{0,62})(\.[a-z\d][-a-z\d]{0,62})*$`) // Minimum one part
	reEmailAddress   = regexp.MustCompile(`^[^<>()[\]\\.,;:\s@"%]+(\.[^<>()[\]\\.,;:\s@"%]+)*@`) // Only the part up to the '@'
	rePortInHostname = regexp.MustCompile(`:\d+$`)

	// Classes of chars that a 'strong' password must have
	passwordCharClasses = []string{
		"0123456789`~!@#$%^&*()_-+=[]{};:'\"|\\<,>.?/",
		"abcdefghijklmnopqrstuvwxyz",
		"ABCDEFGHIJKLMNOPQRSTUVWXYZ",
	}

	// TheMailer is a Mailer implementation available application-wide. Defaults to a mailer that doesn't do anything
	TheMailer intf.Mailer = &noOpMailer{}
)

// ----------------------------------------------------------------------------------------------------------------------

// noOpMailer is an intf.Mailer implementation that doesn't send any emails
type noOpMailer struct{}

func (m *noOpMailer) Operational() bool {
	return false
}

func (m *noOpMailer) Mail(_, recipient, subject, _ string, _ ...string) error {
	logger.Debugf("NoOpMailer: not sending email to '%s' (subject: '%s')", recipient, subject)
	return nil
}

// ----------------------------------------------------------------------------------------------------------------------

// pathRegistry is a PathRegistry implementation
type pathRegistry struct {
	r []string
}

// Add path(s) to the registry
func (p *pathRegistry) Add(path ...string) {
	p.r = append(p.r, path...)
}

// Has returns whether the given path matches any entry in the registry
func (p *pathRegistry) Has(path string) bool {
	for _, s := range p.r {
		if strings.HasPrefix(path, s) {
			return true
		}
	}
	return false
}

// ----------------------------------------------------------------------------------------------------------------------

// CheckErrors picks and returns the first non-nil error, or nil if there's none
func CheckErrors(errs ...error) error {
	for _, err := range errs {
		if err != nil {
			return err
		}
	}
	return nil
}

// CompressGzip compresses a data buffer using gzip
func CompressGzip(b []byte) ([]byte, error) {
	var buf bytes.Buffer
	w := gzip.NewWriter(&buf)
	if _, err := w.Write(b); err != nil {
		_ = w.Close()
		return nil, err
	}

	// Try to gracefully close the writer
	if err := w.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// CountryByIP tries to determine the country code for the given IP address
func CountryByIP(ip string) string {
	// Parse the IP and convert it to a country code. Convert "ZZ" (=unknown) into an empty string
	if country := iploc.Country(net.ParseIP(ip)); country != "ZZ" {
		return country
	}
	return ""
}

// DecompressGzip reads and decompresses a gzip-compressed archive from the given data buffer
func DecompressGzip(data []byte) ([]byte, error) {
	if r, err := gzip.NewReader(bytes.NewReader(data)); err != nil {
		return nil, err
	} else if b, err := io.ReadAll(r); err != nil {
		return nil, err
	} else {
		return b, nil
	}
}

// DecompressZip reads and decompresses a single file in a zip-compressed archive from the given data buffer. The
// archive can contain multiple directories (but only a single file)
func DecompressZip(data []byte) ([]byte, error) {
	// Decompress the data
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, err
	}

	// Verify there's exactly one file in the archive
	var first *zip.File
	for _, f := range zr.File {
		if !f.FileInfo().IsDir() {
			if first != nil {
				return nil, errors.New("expected exactly one file in zip archive, found many")
			}
			first = f
		}
	}

	// If there's no file found
	if first == nil {
		return nil, fmt.Errorf("no files in zip archive")
	}

	// Open the file
	if rc, err := first.Open(); err != nil {
		return nil, err

	} else {
		// Read the entire file
		//goland:noinspection GoUnhandledErrorResult
		defer rc.Close()
		return io.ReadAll(rc)
	}
}

// FormatVersion renders the given uasurfer.Version as a string
func FormatVersion(v *uasurfer.Version) string {
	return fmt.Sprintf("%d.%d.%d", v.Major, v.Minor, v.Patch)
}

// GoTimeout executes the given function in a goroutine, blocking up to the given timeout duration
func GoTimeout(timeout time.Duration, f func()) {
	// Let the function run in a goroutine
	cReady := make(chan bool)
	go func() {
		f()
		cReady <- true
	}()

	// Wait for it to finish, or to time out: whatever comes first
	select {
	case <-cReady:
	case <-time.After(timeout):
	}
}

// HMACSign signs the given data with the given secret, using HMAC with SHA256
func HMACSign(b, secret []byte) []byte {
	h := hmac.New(sha256.New, secret)
	h.Write(b)
	return h.Sum(nil)
}

// HTMLDocumentTitle parses and returns the title of an HTML document
func HTMLDocumentTitle(body io.Reader) (string, error) {
	// Iterate the body's tokens
	tokenizer := html.NewTokenizer(body)
	for {
		// Get the next token type
		//goland:noinspection GoSwitchMissingCasesForIotaConsts
		switch tokenizer.Next() {
		// An error token, we either reached the end of the file, or the HTML was malformed
		case html.ErrorToken:
			err := tokenizer.Err()
			// End of the stream
			if err == io.EOF {
				return "", errors.New("no title found in HTML document")
			}

			// Any other error
			return "", tokenizer.Err()

		// A start tag token
		case html.StartTagToken:
			token := tokenizer.Token()
			// If it's the title tag
			if token.Data == "title" {
				// The next token should be the page title
				if tokenizer.Next() == html.TextToken {
					return tokenizer.Token().Data, nil
				}
			}
		}
	}
}

// HTMLTitleFromURL tries to fetch the specified URL and subsequently extract the title from its HTML document
func HTMLTitleFromURL(u *url.URL) (string, error) {
	// Fetch the URL
	resp, err := http.Get(u.String())
	if err != nil {
		return "", err
	}
	defer LogError(resp.Body.Close, "HTMLTitleFromURL, resp.Body.Close()")

	// Ignore irrelevant HTTP statuses and verify we're dealing with an HTML document
	if resp.StatusCode < 200 || resp.StatusCode > 299 || !strings.HasPrefix(resp.Header.Get("Content-Type"), "text/html") {
		return "", nil
	}

	// Parse the response body
	return HTMLDocumentTitle(resp.Body)
}

// If returns one of the two given values depending on the boolean condition, filling in for the ternary operator
// missing in Go
func If[T any](cond bool, ifTrue, ifFalse T) T {
	if cond {
		return ifTrue
	}
	return ifFalse
}

// IsStrongPassword checks whether the provided password is a 'strong' one
func IsStrongPassword(s string) bool {
	// Check length
	if len(s) < 8 {
		return false
	}

	// Check it has at least one character from each class
	for _, chars := range passwordCharClasses {
		if !strings.ContainsAny(s, chars) {
			return false
		}
	}
	return true
}

// IsValidEmail returns whether the passed string is a valid email address
func IsValidEmail(s string) bool {
	// First validate the part before the '@'
	s = strings.ToLower(s)
	if s != "" && reEmailAddress.MatchString(s) {
		// Then the domain
		if i := strings.IndexByte(s, '@'); i > 0 {
			return IsValidHostname(s[i+1:])
		}
	}
	return false
}

// IsValidHostname returns true if the passed string is a valid domain hostname. This function explicitly denies IP
// addresses and strings that look like them
func IsValidHostname(s string) bool {
	return s != "" && len(s) <= 253 && !reIPLike.MatchString(s) && reDNSHostname.MatchString(s)
}

// IsValidHostPort returns whether the passed string is a valid 'host' or 'host:port' spec, and its host and port
// values. We expressly DON'T support IPv6 addresses (such as '[8234:fa06:f21c:f78f:1aab:84a3:ec1b:174a]:1234') in this
// function
func IsValidHostPort(s string) (bool, string, string) {
	// Check for a possible IPv6 host:port spec - they are not supported
	if strings.ContainsAny(s, "[]") {
		return false, "", ""
	}

	// If there's a ':' in the string, we consider it the 'host:port' format. Otherwise, the entire string is considered
	// a hostname
	host := s
	port := ""
	if i := strings.LastIndex(s, ":"); i >= 0 {
		host = s[:i]
		// Validate port part
		port = s[i+1:]
		if port == "" || !IsValidPort(port) {
			return false, "", ""
		}
	}

	// Validate as either a hostname or an IPv4 address
	if IsValidHostname(host) || IsValidIPv4(host) {
		return true, host, port
	}
	return false, "", ""
}

// IsValidIPv4 returns true if the passed string is a valid IPv4 address
func IsValidIPv4(s string) bool {
	return s != "" && net.ParseIP(s).To4() != nil
}

// IsValidIP returns true if the passed string is a valid IPv4 or IPv6 address
func IsValidIP(s string) bool {
	return s != "" && net.ParseIP(s) != nil
}

// IsValidPort returns true if the passed string represents a valid port
func IsValidPort(s string) bool {
	i, err := strconv.Atoi(s)
	return err == nil && i > 0 && i < 65536
}

// IsValidURL returns whether the passed string is a valid absolute URL. If allowHTTP == false, HTTPS URLs are enforced
func IsValidURL(s string, allowHTTP bool) bool {
	_, err := ParseAbsoluteURL(s, allowHTTP, false)
	return err == nil
}

// LogError calls a function that may return an error, and if it does, logs and discards it
func LogError(f func() error, details string) {
	if err := f(); err != nil {
		logger.Errorf("Error occurred in %s: %v", details, err)
	}
}

// MarkdownToHTML renders the provided markdown string as HTML
func MarkdownToHTML(markdown string, links, images, tables bool) string {
	// Create a new markdown parser/renderer
	md := goldmark.New(
		goldmark.WithExtensions(
			extension.Strikethrough,
			extension.DefinitionList),
		goldmark.WithParserOptions(),
		goldmark.WithRendererOptions(
			gmhtml.WithHardWraps(),
		),
	)

	// Create a sanitizer policy
	p := bluemonday.StrictPolicy()
	p.AllowStandardAttributes()
	p.AllowStandardURLs()
	p.AllowElements(
		// Headings
		"h1", "h2", "h3", "h4", "h5", "h6",
		// Blocks and separators
		"blockquote", "br", "div", "hr", "p", "span",
		// Inline elements
		"abbr", "acronym", "cite", "code", "del", "dfn", "em", "mark", "s", "strong", "sub", "sup", "var", "b", "i",
		"pre", "small", "strike", "tt", "u",
	)
	p.AllowLists()
	p.AddTargetBlankToFullyQualifiedLinks(true)
	p.RequireNoFollowOnFullyQualifiedLinks(true)

	// Link processing
	if links {
		p.AllowAttrs("href").OnElements("a")
		extension.NewLinkify(extension.WithLinkifyAllowedProtocols([][]byte{[]byte("http"), []byte("https")})).
			Extend(md)
	}

	// Image processing
	if images {
		p.AllowImages()
	}

	// Tables
	if tables {
		p.AllowTables()
		extension.Table.Extend(md)
	}

	var buf bytes.Buffer
	if err := md.Convert([]byte(markdown), &buf); err != nil {
		return fmt.Sprintf("[Error converting Markdown to HTML: %v]", err)
	}

	// Sanitize the HTML
	return p.Sanitize(buf.String())
}

// MaskIP hides a part of the given IPv4/IPv6 address
func MaskIP(ip string) string {
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
	return ip
}

// MD5ToHex converts the given MD5 binary checksum into its string representation. If checksum is nil, return an empty
// string
func MD5ToHex(checksum *[16]byte) string {
	if checksum == nil {
		return ""
	}
	return hex.EncodeToString((*checksum)[:])
}

// ParseAbsoluteURL parses and returns the passed string as an absolute URL. If allowHTTP == false, HTTPS URLs are
// enforced. If trimTrailingSlash == true, any trailing slash is removed except when the path consists of a single
// slash
func ParseAbsoluteURL(s string, allowHTTP, trimTrailingSlash bool) (*url.URL, error) {
	// Parse the base URL
	var u *url.URL
	var err error
	if u, err = url.Parse(s); err != nil {
		return nil, fmt.Errorf("failed to parse URL: %v", err)
	}

	// Check the scheme
	if u.Scheme != "https" && !(allowHTTP && u.Scheme == "http") {
		return nil, fmt.Errorf("invalid URL scheme: '%s'", u.Scheme)
	}

	// Check the host
	if u.Host == "" {
		return nil, fmt.Errorf("invalid URL host: '%s'", u.Host)
	}

	// If the path is empty, set it to "/"
	if u.Path == "" {
		u.Path = "/"

		// Otherwise, verify the path starts with "/"
	} else if !strings.HasPrefix(u.Path, "/") {
		return nil, fmt.Errorf("invalid URL path (must begin with '/'): '%s'", u.Path)

	} else if len(u.Path) > 1 && trimTrailingSlash {
		// Remove any trailing slash from the base path, except when it's a root
		u.Path = strings.TrimSuffix(u.Path, "/")
	}
	return u, nil
}

// RandomBytes makes a random byte slice of the desired size
func RandomBytes(n int) ([]byte, error) {
	b := make([]byte, n)
	if _, err := io.ReadFull(cryptorand.Reader, b); err != nil {
		return nil, err
	}
	return b, nil
}

// RandomSleep sleeps a random duration of time within the given interval
func RandomSleep(min, max time.Duration) {
	// Don't bother if max <= min
	if max > min {
		time.Sleep(time.Duration(int64(min) + rand.Int63n(int64(max-min))))
	}
}

// RequestReplacePath returns a clone of the provided HTTP request with its URL's path replaced with the given new one
func RequestReplacePath(req *http.Request, newPath string) *http.Request {
	// Clone the original request
	cr := req.Clone(req.Context())
	// Replace the path, making sure the path starts with a slash
	cr.URL.Path = "/" + strings.TrimPrefix(newPath, "/")
	// Make sure no raw path leftover is stored
	cr.URL.RawPath = ""
	return cr
}

type ErrFunc = func() error

// RunCheckErr runs the provided functions sequentially, stopping on the first non-nil error and returning it, or nil if
// there's none
func RunCheckErr(fs []ErrFunc) error {
	for _, f := range fs {
		if err := f(); err != nil {
			return err
		}
	}
	return nil
}

// StripPort returns the provided hostname or IP address string with any port number part (':xxxx') removed
func StripPort(hostOrIP string) string {
	s := rePortInHostname.ReplaceAllString(hostOrIP, "")

	// Unwrap bracketed IPv6
	if strings.HasPrefix(s, "[") && strings.HasSuffix(s, "]") {
		s = s[1 : len(s)-1]
	}
	return s
}

// StrToFloatDef converts a string to a float64. If conversion fails, returns the given default
func StrToFloatDef(s string, def float64) float64 {
	if s == "" {
		return def
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return def
	}
	return f
}

// ToStringSlice converts a slice of string-derived elements into a string slice
func ToStringSlice[T ~string](in []T) []string {
	// Don't convert nil
	if in == nil {
		return nil
	}

	// Convert the items
	res := make([]string, len(in))
	for i, s := range in {
		res[i] = string(s)
	}
	return res
}

// TruncateStr truncates a string to the given byte length, adding an ellipsis if truncated and possible
func TruncateStr(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}

	// If the allowed length is more than 3, we can add a "…" (it's a 3-byte Unicode char, just like "..." would be,
	// only looks better)
	var suffix string
	if maxLen >= 3 {
		maxLen -= 3
		suffix = "…"
	}

	// Find the appropriate byte length that doesn't damage the last Unicode (possibly multibyte) char
	for maxLen > 0 && !utf8.RuneStart(s[maxLen]) {
		maxLen--
	}

	// Just truncate the string otherwise
	return s[:maxLen] + suffix
}

// UserAgent return the value of the User-Agent request header
func UserAgent(r *http.Request) string {
	return r.Header.Get("User-Agent")
}

// UserIP tries to determine the user IP, returning either a valid IPv4/IPv6 address or an empty string
func UserIP(r *http.Request) string {
	// First, try the X-Forwarded-For
	if s := r.Header.Get("X-Forwarded-For"); s != "" {
		// This header may contain multiple, comma-separated values. We're interested in the first one (client IP)
		if ip, _, _ := strings.Cut(s, ","); IsValidIP(ip) {
			return ip
		}
	}

	// Next, the X-Real-Ip
	if ip := r.Header.Get("X-Real-Ip"); IsValidIP(ip) {
		return ip
	}

	// Fall back to the remote IP from the request
	if ip := StripPort(r.RemoteAddr); IsValidIP(ip) {
		return ip
	}

	// Failed to determine the IP
	return ""
}

// UserIPCountry tries to determine the IP address and country code of the user based on it, optionally masking the IP
func UserIPCountry(r *http.Request, maskIP bool) (ip, country string) {
	ip = UserIP(r)
	country = CountryByIP(ip)
	if maskIP {
		ip = MaskIP(ip)
	}
	return
}
