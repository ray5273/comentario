package data

import (
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"github.com/avct/uasurfer"
	"github.com/go-openapi/strfmt"
	"github.com/google/uuid"
	"github.com/markbates/goth"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/util"
	"golang.org/x/crypto/bcrypt"
	"net/http"
	"time"
)

// AnonymousUser is a predefined "anonymous" user, identified by a special UUID ('00000000-0000-0000-0000-000000000000')
var AnonymousUser = &User{Name: "Anonymous"}

type FederatedIdentityProvider struct {
	Icon   string                // Provider icon name
	ID     models.FederatedIdpID // Provider ID
	Name   string                // Provider name
	GothID string                // ID of the corresponding goth provider (if any)
}

// ToDTO converts this model into an API model
func (p *FederatedIdentityProvider) ToDTO() *models.FederatedIdentityProvider {
	return &models.FederatedIdentityProvider{
		Icon: p.Icon,
		ID:   p.ID,
		Name: p.Name,
	}
}

// FederatedIdProviders accumulates information about all supported ID providers
var FederatedIdProviders = map[models.FederatedIdpID]FederatedIdentityProvider{
	models.FederatedIdpIDGithub:  {ID: models.FederatedIdpIDGithub, Name: "GitHub", Icon: "github", GothID: "github"},
	models.FederatedIdpIDGitlab:  {ID: models.FederatedIdpIDGitlab, Name: "GitLab", Icon: "gitlab", GothID: "gitlab"},
	models.FederatedIdpIDGoogle:  {ID: models.FederatedIdpIDGoogle, Name: "Google", Icon: "google", GothID: "google"},
	models.FederatedIdpIDTwitter: {ID: models.FederatedIdpIDTwitter, Name: "Twitter", Icon: "twitter", GothID: "twitter"},
}

// GetFederatedIdP returns whether federated identity provider is known and configured, and if yes, its Provider
// interface
func GetFederatedIdP(id models.FederatedIdpID) (known, configured bool, provider goth.Provider) {
	// Look up the IdP
	var fidp FederatedIdentityProvider
	if fidp, known = FederatedIdProviders[id]; !known {
		return
	}

	// IdP found, now verify it's configured
	provider, err := goth.GetProvider(fidp.GothID)
	configured = err == nil
	return
}

// ---------------------------------------------------------------------------------------------------------------------

type TokenScope string

const (
	TokenScopeResetPassword = TokenScope("pwd-reset")     // Bearer can reset their password
	TokenScopeConfirmEmail  = TokenScope("confirm-email") // Bearer makes their account confirmed
	TokenScopeLogin         = TokenScope("login")         // Bearer is eligible for a one-time login
)

// Token is, well, a token
type Token struct {
	Value       []byte     // Token value, a random byte sequence
	Owner       uuid.UUID  // UUID of the user owning the token. If zero (i.e. AnonymousUser.ID), the token is anonymous
	Scope       TokenScope // Token's scope
	ExpiresTime time.Time  // UTC timestamp of the expiration
	Multiuse    bool       // Whether the token is to be kept until expired; if false, the token gets deleted after first use
}

// NewToken creates a new token instance. If owner == nil, an anonymous token is created
func NewToken(owner *uuid.UUID, scope TokenScope, maxAge time.Duration, multiuse bool) (*Token, error) {
	// If it's an anonymous token
	if owner == nil {
		owner = &AnonymousUser.ID
	}

	// Instantiate a new token
	t := &Token{
		Owner:       *owner,
		Scope:       scope,
		ExpiresTime: time.Now().UTC().Add(maxAge),
		Multiuse:    multiuse,
	}

	// Generate a random 32-byte value
	var err error
	if t.Value, err = util.RandomBytes(32); err != nil {
		return nil, err
	}
	return t, nil
}

// IsAnonymous returns whether the token is anonymous (i.e. belonging to an anonymous user)
func (t *Token) IsAnonymous() bool {
	return t.Owner == AnonymousUser.ID
}

// String converts the token's value into a hex string
func (t *Token) String() string {
	return hex.EncodeToString(t.Value)
}

// ---------------------------------------------------------------------------------------------------------------------

// AuthSession holds information about federated authentication session
type AuthSession struct {
	ID          uuid.UUID // Unique session ID
	TokenValue  []byte    // Reference to the anonymous token authenticated was initiated with
	Data        string    // Opaque serialised session data
	Host        string    // Optional source page host
	CreatedTime time.Time // When the session was created
	ExpiresTime time.Time // When the session expires
}

// NewAuthSession instantiates a new AuthSession
func NewAuthSession(data, host string, token []byte) *AuthSession {
	now := time.Now().UTC()
	return &AuthSession{
		ID:          uuid.New(),
		TokenValue:  token,
		Data:        data,
		Host:        host,
		CreatedTime: now,
		ExpiresTime: now.Add(util.AuthSessionDuration),
	}
}

// ---------------------------------------------------------------------------------------------------------------------

// User represents an authenticated or an anonymous user
type User struct {
	ID            uuid.UUID     // Unique user ID
	Email         string        // Unique user email
	Name          string        // User's full name
	PasswordHash  string        // Password hash
	SystemAccount bool          // Whether the user is a system account (cannot sign in)
	Superuser     bool          // Whether the user is a "super user" (instance admin)
	Confirmed     bool          // Whether the user's email has been confirmed
	ConfirmedTime sql.NullTime  // When the user's email has been confirmed
	CreatedTime   time.Time     // When the user was created
	UserCreated   uuid.NullUUID // Reference to the user who created this one. null if the used signed up themselves
	SignupIP      string        // IP address the user signed up or was created from
	SignupCountry string        // 2-letter country code matching the SignupIP
	SignupHost    string        // Host the user signed up on (only for commenter signup, empty for UI signup)
	Banned        bool          // Whether the user is banned
	BannedTime    sql.NullTime  // When the user was banned
	UserBanned    uuid.NullUUID // Reference to the user who banned this one
	Remarks       string        // Optional remarks for the user
	FederatedIdP  string        // Optional ID of the federated identity provider used for authentication. If empty, it's a local user
	FederatedID   string        // User ID as reported by the federated identity provider (only when federated_idp is set)
	Avatar        []byte        // Optional user's avatar image
	WebsiteURL    string        // Optional user's website URL
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

// IsLocal returns whether the user is local (as opposed to a federated one)
func (u *User) IsLocal() bool {
	return u.FederatedIdP == ""
}

// ToCommenter converts this user into a Commenter model
func (u *User) ToCommenter(commenter, moderator bool) *models.Commenter {
	return &models.Commenter{
		AvatarURL:   "", // TODO new-db
		Email:       strfmt.Email(u.Email),
		ID:          strfmt.UUID(u.ID.String()),
		IsCommenter: commenter,
		IsModerator: moderator,
		Name:        u.Name,
		WebsiteURL:  strfmt.URI(u.WebsiteURL),
	}
}

// ToPrincipal converts this user into a Principal model. du is an optional domain user model, applying for commenter
// authentication only; should be nil for UI authentication
func (u *User) ToPrincipal(du *DomainUser) *models.Principal {
	return &models.Principal{
		Email:           strfmt.Email(u.Email),
		ID:              strfmt.UUID(u.ID.String()),
		IsCommenter:     du != nil && du.IsCommenter,
		IsConfirmed:     u.Confirmed,
		IsLocal:         u.FederatedIdP == "",
		IsModerator:     du != nil && du.IsModerator,
		IsOwner:         du != nil && du.IsOwner,
		Name:            u.Name,
		NotifyModerator: du != nil && du.NotifyModerator,
		NotifyReplies:   du != nil && du.NotifyReplies,
		WebsiteURL:      strfmt.URI(u.WebsiteURL),
	}
}

// VerifyPassword checks whether the provided password matches the hash
func (u *User) VerifyPassword(s string) bool {
	return bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(s)) == nil
}

// WithConfirmed sets the value of Confirmed and ConfirmedTime
func (u *User) WithConfirmed(b bool) *User {
	if u.Confirmed != b {
		u.Confirmed = b
		if b {
			u.ConfirmedTime = sql.NullTime{Time: time.Now().UTC(), Valid: true}
		}
	}
	return u
}

// WithEmail sets the Email value
func (u *User) WithEmail(s string) *User {
	u.Email = s
	return u
}

// WithFederated sets the federated IdP values
func (u *User) WithFederated(id, idpID string) *User {
	u.FederatedID = id
	u.FederatedIdP = idpID
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
	u.SignupHost = url
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

// DomainModNotifyPolicy describes moderator notification policy on a specific domain
type DomainModNotifyPolicy string

const (
	DomainModNotifyPolicyNone    DomainModNotifyPolicy = "none"    // Do not notify domain moderators
	DomainModNotifyPolicyPending                       = "pending" // Only notify domain moderator about comments pending moderation
	DomainModNotifyPolicyAll                           = "all"     // Notify moderators about every comment
)

// Domain holds domain configuration
type Domain struct {
	ID               uuid.UUID             // Unique record ID
	Name             string                // Domain display name
	Host             string                // Domain host
	CreatedTime      time.Time             // When the domain was created
	IsReadonly       bool                  // Whether the domain is readonly (no new comments are allowed)
	AuthAnonymous    bool                  // Whether anonymous comments are allowed
	AuthLocal        bool                  // Whether local authentication is allowed
	AuthSso          bool                  // Whether SSO authentication is allowed
	SsoURL           string                // SSO provider URL
	SsoSecret        string                // SSO secret
	ModAnonymous     bool                  // Whether all anonymous comments are to be approved by a moderator
	ModAuthenticated bool                  // Whether all non-anonymous comments are to be approved by a moderator
	ModLinks         bool                  // Whether all comments containing a link are to be approved by a moderator
	ModImages        bool                  // Whether all comments containing an image are to be approved by a moderator
	ModNotifyPolicy  DomainModNotifyPolicy // Moderator notification policy for domain: 'none', 'pending', 'all'
	DefaultSort      string                // Default comment sorting for domain. 1st letter: s = score, t = timestamp; 2nd letter: a = asc, d = desc
	CountComments    int64                 // Total number of comments
	CountViews       int64                 // Total number of views
}

// ToDTO converts this model into an API model
func (d *Domain) ToDTO() *models.Domain {
	return &models.Domain{
		AuthAnonymous:    d.AuthAnonymous,
		AuthLocal:        d.AuthLocal,
		AuthSso:          d.AuthSso,
		CountComments:    d.CountComments,
		CountViews:       d.CountViews,
		CreatedTime:      strfmt.DateTime(d.CreatedTime),
		DefaultSort:      models.CommentSort(d.DefaultSort),
		Host:             models.Host(d.Host),
		ID:               strfmt.UUID(d.ID.String()),
		IsReadonly:       d.IsReadonly,
		ModAnonymous:     d.ModAnonymous,
		ModAuthenticated: d.ModAuthenticated,
		ModImages:        d.ModImages,
		ModLinks:         d.ModLinks,
		ModNotifyPolicy:  models.DomainModNotifyPolicy(d.ModNotifyPolicy),
		Name:             d.Name,
		SsoURL:           d.SsoURL,
	}
}

// ---------------------------------------------------------------------------------------------------------------------

// DomainUser represents user configuration in a specific domain
type DomainUser struct {
	DomainID        uuid.UUID // ID of the domain
	UserID          uuid.UUID // ID of the user
	IsOwner         bool      // Whether the user is an owner of the domain (assumes is_moderator and is_commenter)
	IsModerator     bool      // Whether the user is a moderator of the domain (assumes is_commenter)
	IsCommenter     bool      // Whether the user is a commenter of the domain (if false, the user is readonly on the domain)
	NotifyReplies   bool      // Whether the user is to be notified about replies to their comments
	NotifyModerator bool      // Whether the user is to receive moderator notifications (only when is_moderator is true)
}

// IsReadonly returns whether the domain user is not allowed to comment (is readonly). Can be called against a nil
// receiver, which is interpreted as no domain user has been created yet for this specific user hence they're NOT
// readonly
func (u *DomainUser) IsReadonly() bool {
	return u != nil && !u.IsOwner && !u.IsModerator && !u.IsCommenter
}

// ---------------------------------------------------------------------------------------------------------------------

// DomainPage represents a page on a specific domain
type DomainPage struct {
	ID            uuid.UUID // Unique record ID
	DomainID      uuid.UUID // ID of the domain
	Path          string    // Page path
	Title         string    // Page title
	IsReadonly    bool      // Whether the page is readonly (no new comments are allowed)
	CreatedTime   time.Time // When the record was created
	CountComments int64     // Total number of comments
	CountViews    int64     // Total number of views
}

// DisplayTitle returns a display title of the page: either its title if it's set, otherwise the domain's host and path
func (p *DomainPage) DisplayTitle(domain *Domain) string {
	if p.Title != "" {
		return p.Title
	}
	return domain.Host + p.Path
}

// WithIsReadonly sets the IsReadonly value
func (p *DomainPage) WithIsReadonly(b bool) *DomainPage {
	p.IsReadonly = b
	return p
}

// ---------------------------------------------------------------------------------------------------------------------

// Comment represents a comment
type Comment struct {
	ID           uuid.UUID     // Unique record ID
	ParentID     uuid.NullUUID // Parent record ID, null if it's a root comment on the page
	PageID       uuid.UUID     // Reference to the page
	Markdown     string        // Comment text in markdown
	HTML         string        // Rendered comment text in HTML
	Score        int           // Comment score
	IsSticky     bool          // Whether the comment is sticky (attached to the top of page)
	IsApproved   bool          // Whether the comment is approved and can be seen by everyone
	IsSpam       bool          // Whether the comment is flagged as (potential) spam
	IsDeleted    bool          // Whether the comment is marked as deleted
	CreatedTime  time.Time     // When the comment was created
	ApprovedTime sql.NullTime  // When the comment was approved
	DeletedTime  sql.NullTime  // When the comment was marked as deleted
	UserCreated  uuid.NullUUID // Reference to the user who created the comment
	UserApproved uuid.NullUUID // Reference to the user who approved the comment
	UserDeleted  uuid.NullUUID // Reference to the user who deleted the comment
}

// IsAnonymous returns whether the comment is authored by an anonymous or nonexistent (deleted) commenter
func (c *Comment) IsAnonymous() bool {
	return !c.UserCreated.Valid || c.UserCreated.UUID == AnonymousUser.ID
}

// IsRoot returns whether it's a root comment (i.e. its parent ID is null)
func (c *Comment) IsRoot() bool {
	return !c.ParentID.Valid
}

// MarkApprovedBy sets the value of Approved to true and updates related fields
func (c *Comment) MarkApprovedBy(userID *uuid.UUID) {
	c.IsApproved = true
	c.UserApproved = uuid.NullUUID{UUID: *userID, Valid: true}
	c.ApprovedTime = sql.NullTime{Time: time.Now().UTC(), Valid: true}
}

// ToDTO converts this model into an API model
// NB: leaves the Direction at 0
func (c *Comment) ToDTO() *models.Comment {
	return &models.Comment{
		CreatedTime: strfmt.DateTime(c.CreatedTime),
		HTML:        c.HTML,
		ID:          strfmt.UUID(c.ID.String()),
		IsApproved:  c.IsApproved,
		IsDeleted:   c.IsDeleted,
		IsSpam:      c.IsSpam,
		IsSticky:    c.IsSticky,
		Markdown:    c.Markdown,
		PageID:      strfmt.UUID(c.PageID.String()),
		ParentID:    NullUUIDStr(&c.ParentID),
		Score:       int64(c.Score),
		UserCreated: NullUUIDStr(&c.UserCreated),
	}
}
