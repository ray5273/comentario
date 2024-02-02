package util

import (
	"golang.org/x/text/language"
	"time"
)

// Various constants and constant-like vars

const (
	ApplicationName = "Comentario"     // Application name
	APIPath         = "api/"           // Root path of the API requests
	SwaggerUIPath   = APIPath + "docs" // Root path of the Swagger UI
	WebSocketsPath  = "ws/"            // Root path of the WebSockets endpoints

	OneDay = 24 * time.Hour // Time unit representing one day

	DBMaxAttempts = 10 // Max number of attempts to connect to the database

	ResultPageSize = 25 // Max number of database rows to return

	MaxNumberStatsDays = 30 // Max number of days to get statistics for
)

// Cookie names

const (
	CookieNameUserSession = "comentario_user_session"  // Cookie name to store the session of the authenticated user
	CookieNameAuthSession = "_comentario_auth_session" // Cookie name to store the federated authentication session ID
	CookieNameXSRFSession = "_xsrf_session"            // Cookie name where Gorilla CSRF must store its session
	CookieNameXSRFToken   = "XSRF-TOKEN"               // Cookie name to store XSRF token #nosec G101
)

// Header names

const (
	HeaderUserSession = "X-User-Session" // Name of the header that contains the session of the authenticated user
	HeaderXSRFToken   = "X-Xsrf-Token"   // Header name that the request should provide the XSRF token in #nosec G101
)

// Durations

const (
	UserSessionDuration      = 28 * OneDay      // How long a user session stays valid
	AuthSessionDuration      = 15 * time.Minute // How long auth session stays valid
	LangCookieDuration       = 365 * OneDay     // How long the language cookie stays valid
	UserConfirmEmailDuration = 3 * OneDay       // How long the token in the confirmation email stays valid
	UserPwdResetDuration     = 12 * time.Hour   // How long the token in the password-reset email stays valid
	PageViewRetentionPeriod  = 45 * OneDay      // How long a page view stats record is retained
	AvatarFetchTimeout       = 5 * time.Second  // Timeout for fetching external avatars
)

var (
	WrongAuthDelayMin = 100 * time.Millisecond // Minimal delay to exercise on a wrong email, password etc.
	WrongAuthDelayMax = 4 * time.Second        // Maximal delay to exercise on a wrong email, password etc.

	// UILanguageTags stores tags of supported frontend languages
	UILanguageTags = []language.Tag{
		language.English, // The first language is used as fallback
	}

	// UIDefaultLangID is the ID of the default interface language
	UIDefaultLangID = UILanguageTags[0].String()

	// UILangMatcher is a matcher instance for UI languages
	UILangMatcher = language.NewMatcher(UILanguageTags)

	// UIStaticPaths stores a map of known UI static paths to a flag that says whether the file contains replacements
	UIStaticPaths = map[string]bool{
		"favicon.ico":    false,
		"comentario.js":  true,
		"comentario.css": true,
	}

	// XSRFSafePaths stores a list of path prefixes that should be excluded from XSRF protection
	XSRFSafePaths = &pathRegistry{}
)

func init() {
	XSRFSafePaths.Add(
		"/api/embed/", // Embed endpoints are cross-site by design because scripts are always loaded from a different origin
	)
}
