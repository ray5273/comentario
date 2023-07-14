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

	OneDay = 24 * time.Hour // Time unit representing one day

	DBMaxAttempts = 10 // Max number of attempts to connect to the database

	ResultPageSize = 25 // Max number of database rows to return

	MaxNumberStatsDays = 30 // Max number of days to get statistics for

	UserAvatarSize = 38 // User avatar size in pixels

	CookieNameUserSession    = "comentario_user_session"  // Cookie name to store the session of the authenticated user
	UserSessionDuration      = 28 * OneDay                // How long a user session stays valid
	CookieNameAuthSession    = "_comentario_auth_session" // Cookie name to store the federated authentication session ID
	AuthSessionDuration      = 15 * time.Minute           // How long auth session stays valid
	LangCookieDuration       = 365 * OneDay               // How long the language cookie stays valid
	HeaderUserSession        = "X-User-Session"           // Name of the header that contains the session of the authenticated user
	UserConfirmEmailDuration = 3 * OneDay                 // How long the token in the confirmation email stays valid
	UserPwdResetDuration     = 12 * time.Hour             // How long the token in the password-reset email stays valid
)

var (
	WrongAuthDelayMin = 100 * time.Millisecond // Minimal delay to exercise on a wrong email, password etc.
	WrongAuthDelayMax = 4 * time.Second        // Maximal delay to exercise on a wrong email, password etc.

	// FederatedIdProviders maps all known federated identity providers from our IDs to goth IDs

	// UILanguageTags stores tags of supported frontend languages
	UILanguageTags = []language.Tag{
		language.English, // The first language is used as fallback
	}

	// UILangMatcher is a matcher instance for UI languages
	UILangMatcher = language.NewMatcher(UILanguageTags)

	// UIStaticPaths stores a map of known UI static paths to a flag that says whether the file contains replacements
	UIStaticPaths = map[string]bool{
		"favicon.ico":    false,
		"comentario.js":  true,
		"comentario.css": true,
	}
)
