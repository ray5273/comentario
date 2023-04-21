package data

import (
	"encoding/base64"
	"github.com/avct/uasurfer"
	"github.com/go-openapi/strfmt"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/util"
	"golang.org/x/crypto/bcrypt"
	"net/http"
	"time"
)

const RootParentHexID = models.ParentHexID("root") // The "root" parent hex

// AnonymousUser is a predefined "anonymous" user, identified by a special UUID ('00000000-0000-0000-0000-000000000000')
var AnonymousUser = &User{Name: "Anonymous"}

type FederatedIdentityProvider struct {
	models.IdentityProvider
	GothID string // ID of the corresponding goth provider (if any)
}

// FederatedIdProviders accumulates information about all supported ID providers
var FederatedIdProviders = map[models.IdentityProviderID]*FederatedIdentityProvider{
	models.IdentityProviderIDGithub:  {IdentityProvider: models.IdentityProvider{ID: models.IdentityProviderIDGithub, Name: "GitHub"}, GothID: "github"},
	models.IdentityProviderIDGitlab:  {IdentityProvider: models.IdentityProvider{ID: models.IdentityProviderIDGitlab, Name: "GitLab"}, GothID: "gitlab"},
	models.IdentityProviderIDGoogle:  {IdentityProvider: models.IdentityProvider{ID: models.IdentityProviderIDGoogle, Name: "Google"}, GothID: "google"},
	models.IdentityProviderIDTwitter: {IdentityProvider: models.IdentityProvider{ID: models.IdentityProviderIDTwitter, Name: "Twitter"}, GothID: "twitter"},
}

// ---------------------------------------------------------------------------------------------------------------------

// User represents an authenticated or an anonymous user
type User struct {
	ID            uuid.UUID  // Unique user ID
	Email         string     // Unique user email
	Name          string     // User's full name
	PasswordHash  string     // Password hash
	SystemAccount bool       // Whether the user is a system account (cannot sign in)
	Superuser     bool       // Whether the user is a "super user" (instance admin)
	Confirmed     bool       // Whether the user's email has been confirmed
	ConfirmedTime time.Time  // When the user's email has been confirmed
	CreatedTime   time.Time  // When the user was created
	UserCreated   *uuid.UUID // Reference to the user who created this one. null if the used signed up themselves
	SignupIP      string     // IP address the user signed up or was created from
	SignupCountry string     // 2-letter country code matching the signup_ip
	Banned        bool       // Whether the user is banned
	BannedTime    time.Time  // When the user was banned
	UserBanned    *uuid.UUID // Reference to the user who banned this one
	Remarks       string     // Optional remarks for the user
	FederatedIdP  string     // Optional ID of the federated identity provider used for authentication. If empty, it's a local user
	FederatedID   string     // User ID as reported by the federated identity provider (only when federated_idp is set)
	Avatar        []byte     // Optional user's avatar image
	WebsiteURL    string     // Optional user's website URL
}

// IsAnonymous returns whether the underlying user is anonymous
func (u *User) IsAnonymous() bool {
	return u.ID == AnonymousUser.ID
}

// SetPassword updates the PasswordHash from the provided plain-test password. If s is empty, also sets the hash to
// empty
func (u *User) SetPassword(s string) error {
	// If no password is provided, remove the hash. This means the user won't be able to log in
	if s == "" {
		u.PasswordHash = ""
		return nil
	}

	// Hash and save the password
	if h, err := bcrypt.GenerateFromPassword([]byte(s), bcrypt.DefaultCost); err != nil {
		return err
	} else {
		u.PasswordHash = string(h)
	}
	return nil
}

// ToPrincipal converts this user into a Principal model
func (u *User) ToPrincipal() *models.Principal {
	return &models.Principal{
		Email:       strfmt.Email(u.Email),
		ID:          strfmt.UUID(u.ID.String()),
		IsConfirmed: u.Confirmed,
		Name:        u.Name,
	}
}

// VerifyPassword checks whether the provided password matches the hash
func (u *User) VerifyPassword(s string) bool {
	return bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(s)) == nil
}

// ---------------------------------------------------------------------------------------------------------------------

// UserSession represents an authenticated user session
type UserSession struct {
	ID             uuid.UUID // Unique session ID
	UserID         uuid.UUID // ID of the user who owns the session
	CreatedTime    time.Time // When the session was created
	ExpiresTime    time.Time // When the session expires
	Host           string    // Host the session was created on (only for commenter login, empty for UI login)
	Proto          string    // The protocol version, like "HTTP/1.0"
	IP             string    // IP address the session was created from
	Country        string    // 2-letter country code matching the ip
	BrowserName    string    // Name of the user's browser
	BrowserVersion string    // Version of the user's browser
	OSName         string    // Name of the user's OS
	OSVersion      string    // Version of the user's OS
	Device         string    // User's device type
}

// EncodeIDs returns user and session IDs encoded into a base64 string
func (us *UserSession) EncodeIDs() string {
	return base64.RawURLEncoding.EncodeToString(append(us.UserID[:], us.ID[:]...))
}

// NewUserSession instantiates a new UserSession from the given request
func NewUserSession(userID *uuid.UUID, host string, req *http.Request) *UserSession {
	// Extract the remote IP and country
	ip, country := util.UserIPCountry(req)

	// Parse the User Agent header
	ua := uasurfer.Parse(req.Header.Get("User-Agent"))

	// Instantiate a session
	now := time.Now().UTC()
	return &UserSession{
		ID:             uuid.New(),
		UserID:         *userID,
		CreatedTime:    now,
		ExpiresTime:    now.Add(util.UserSessionDuration),
		Host:           host,
		Proto:          req.Proto,
		IP:             ip,
		Country:        country,
		BrowserName:    ua.Browser.Name.StringTrimPrefix(),
		BrowserVersion: util.FormatVersion(&ua.Browser.Version),
		OSName:         ua.OS.Name.StringTrimPrefix(),
		OSVersion:      util.FormatVersion(&ua.OS.Version),
		Device:         ua.DeviceType.StringTrimPrefix(),
	}
}
