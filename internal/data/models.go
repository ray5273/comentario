package data

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
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

type TokenScope string

const (
	TokenResetPassword = TokenScope("pwd-reset")
	TokenConfirmEmail  = TokenScope("confirm-email")
)

// Token is, well, a token
type Token struct {
	Value       []byte     // Token value, a random byte sequence
	Owner       uuid.UUID  // UUID of the user owning the token
	Scope       TokenScope // Token's scope
	ExpiresTime time.Time  // UTC timestamp of the expiration
	Multiuse    bool       // Whether the token is to be kept until expired; if false, the token gets deleted after first use
}

// NewToken creates a new token instance
func NewToken(owner *uuid.UUID, scope TokenScope, maxAge time.Duration, multiuse bool) (*Token, error) {
	t := &Token{
		Value:       make([]byte, 32),
		Owner:       *owner,
		Scope:       scope,
		ExpiresTime: time.Now().UTC().Add(maxAge),
		Multiuse:    multiuse,
	}
	if _, err := rand.Read(t.Value); err != nil {
		return nil, err
	}
	return t, nil
}

// String converts the token's value into a hex string
func (t *Token) String() string {
	return hex.EncodeToString(t.Value)
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
	SignupCountry string     // 2-letter country code matching the SignupIP
	SignupURL     string     // URL the user signed up on (only for commenter signup, empty for UI signup)
	Banned        bool       // Whether the user is banned
	BannedTime    time.Time  // When the user was banned
	UserBanned    *uuid.UUID // Reference to the user who banned this one
	Remarks       string     // Optional remarks for the user
	FederatedIdP  string     // Optional ID of the federated identity provider used for authentication. If empty, it's a local user
	FederatedID   string     // User ID as reported by the federated identity provider (only when federated_idp is set)
	Avatar        []byte     // Optional user's avatar image
	WebsiteURL    string     // Optional user's website URL
}

// NewUser instantiates a new User
func NewUser(email, name string) *User {
	return &User{
		ID:          uuid.New(),
		Email:       email,
		Name:        name,
		CreatedTime: time.Now().UTC(),
	}
}

// IsAnonymous returns whether the user is anonymous
func (u *User) IsAnonymous() bool {
	return u.ID == AnonymousUser.ID
}

// IsLocal returns whether the user is local (as opposed to federated)
func (u *User) IsLocal() bool {
	return u.FederatedIdP == ""
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

// WithConfirmed sets the value of Confirmed and ConfirmedTime
func (u *User) WithConfirmed(b bool) *User {
	u.Confirmed = b
	if b {
		u.ConfirmedTime = time.Now().UTC()
	}
	return u
}

// WithEmail sets the Email value
func (u *User) WithEmail(s string) *User {
	u.Email = s
	return u
}

// WithName sets the Name value
func (u *User) WithName(s string) *User {
	u.Name = s
	return u
}

// WithPassword updates the PasswordHash from the provided plain-test password. If s is empty, also sets the hash to
// empty
func (u *User) WithPassword(s string) *User {
	// If no password is provided, remove the hash. This means the user won't be able to log in
	if s == "" {
		u.PasswordHash = ""

		// Hash and save the password
	} else if h, err := bcrypt.GenerateFromPassword([]byte(s), bcrypt.DefaultCost); err != nil {
		panic(err)
	} else {
		u.PasswordHash = string(h)
	}
	return u
}

// WithSignup sets the SignupIP and SignupCountry values based on the provided HTTP request and URL
func (u *User) WithSignup(req *http.Request, url string) *User {
	u.SignupIP, u.SignupCountry = util.UserIPCountry(req)
	u.SignupURL = url
	return u
}

// WithWebsiteURL sets the WebsiteURL value
func (u *User) WithWebsiteURL(s string) *User {
	u.WebsiteURL = s
	return u
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

// EncodeIDs returns user and session IDs encoded into a base64 string
func (us *UserSession) EncodeIDs() string {
	return base64.RawURLEncoding.EncodeToString(append(us.UserID[:], us.ID[:]...))
}

// ---------------------------------------------------------------------------------------------------------------------

// DomainModerationPolicy describes comment moderation policy on a specific domain
type DomainModerationPolicy string

const (
	DomainModerationPolicyNone      DomainModerationPolicy = "none"      // No comments require moderation
	DomainModerationPolicyAnonymous                        = "anonymous" // Comments by anonymous commenters require moderation
	DomainModerationPolicyAll                              = "all"       // All comments require moderation
)

// DomainModNotifyPolicy describes moderator notification policy on a specific domain
type DomainModNotifyPolicy string

const (
	DomainModNotifyPolicyNone    DomainModNotifyPolicy = "none"    // Do not notify domain moderators
	DomainModNotifyPolicyPending                       = "pending" // Only notify domain moderator about comments pending moderation
	DomainModNotifyPolicyAll                           = "all"     // Notify moderators about every comment
)

// Domain holds domain configuration
type Domain struct {
	ID               uuid.UUID              // Unique record ID
	Name             string                 // Domain display name
	Host             string                 // Domain host
	CreatedTime      time.Time              // When the domain was created
	IsReadonly       bool                   // Whether the domain is readonly (no new comments are allowed)
	AuthAnonymous    bool                   // Whether anonymous comments are allowed
	AuthLocal        bool                   // Whether local authentication is allowed
	AuthSso          bool                   // Whether SSO authentication is allowed
	SsoUrl           string                 // SSO provider URL
	SsoSecret        string                 // SSO secret
	ModerationPolicy DomainModerationPolicy // Moderation policy for domain: 'none', 'anonymous', 'all'
	ModNotifyPolicy  DomainModNotifyPolicy  // Moderator notification policy for domain: 'none', 'pending', 'all'
	DefaultSort      string                 // Default comment sorting for domain. 1st letter: s = score, t = timestamp; 2nd letter: a = asc, d = desc
	CountComments    int64                  // Total number of comments
	CountViews       int64                  // Total number of views
}

// NewDomain instantiates a new Domain
func NewDomain(name, host string) *Domain {
	return &Domain{
		ID:               uuid.New(),
		Name:             name,
		Host:             host,
		CreatedTime:      time.Now().UTC(),
		ModerationPolicy: DomainModerationPolicyNone,
		ModNotifyPolicy:  DomainModNotifyPolicyPending,
		DefaultSort:      "ta",
	}
}

// ---------------------------------------------------------------------------------------------------------------------

// DomainUser represent user configuration in a specific domain
type DomainUser struct {
	DomainID        uuid.UUID // ID of the domain
	UserID          uuid.UUID // ID of the user
	IsOwner         bool      // Whether the user is an owner of the domain (assumes is_moderator and is_commenter)
	IsModerator     bool      // Whether the user is a moderator of the domain (assumes is_commenter)
	IsCommenter     bool      // Whether the user is a commenter of the domain (if false, the user is readonly on the domain)
	NotifyReplies   bool      // Whether the user is to be notified about replies to their comments
	NotifyModerator bool      // Whether the user is to receive moderator notifications (only when is_moderator is true)
}
