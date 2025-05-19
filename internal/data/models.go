package data

import (
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"github.com/avct/uasurfer"
	"github.com/doug-martin/goqu/v9"
	"github.com/doug-martin/goqu/v9/exp"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/extend/intf"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/util"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/text/language"
	"net/http"
	"strings"
	"time"
)

// AnonymousUser is a predefined "anonymous" user, identified by a special UUID ('00000000-0000-0000-0000-000000000000')
var AnonymousUser = &User{Name: "Anonymous", SystemAccount: true}

const (
	MaxPageTitleLength     = 100 // Maximum length allowed for a page title
	MaxPendingReasonLength = 255 // Maximum length allowed for Comment.PendingReason field
	ColourIndexCount       = 60  // Number of colours in the palette used to colourise users based on their IDs
)

// DTOAware is an interface capable of converting a model into an API model
type DTOAware[T any] interface {
	ToDTO() T
}

// ---------------------------------------------------------------------------------------------------------------------

// Attribute represents a key-value pair with a timestamp
type Attribute struct {
	Key         string    `db:"key" goqu:"skipupdate"` // Key
	Value       string    `db:"value"`                 // Value
	UpdatedTime time.Time `db:"ts_updated"`            // Timestamp when the record was last updated
}

// ---------------------------------------------------------------------------------------------------------------------

type SortDirection bool

const (
	SortAsc  = SortDirection(false)
	SortDesc = SortDirection(true)
)

// String converts this SortDirection into a string
func (sd SortDirection) String() string {
	return util.If(sd == SortDesc, "desc", "asc")
}

// ToOrderedExpression converts the given direction and a related identifier to goqu's OrderedExpression
func (sd SortDirection) ToOrderedExpression(ident string) exp.OrderedExpression {
	i := goqu.I(ident)
	if sd == SortAsc {
		return i.Asc()
	}
	return i.Desc()
}

// ---------------------------------------------------------------------------------------------------------------------

// FederatedIdentityProvider describes a federated identity provider
type FederatedIdentityProvider struct {
	ID       models.FederatedIdpID // Provider ID
	Name     string                // Provider name
	GothName string                // Name of the corresponding goth provider
}

// ToDTO converts this model into an API model
func (p *FederatedIdentityProvider) ToDTO() *models.FederatedIdentityProvider {
	return &models.FederatedIdentityProvider{
		ID:   p.ID,
		Name: p.Name,
	}
}

// ---------------------------------------------------------------------------------------------------------------------

type TokenScope string

const (
	TokenScopeResetPassword      = TokenScope("pwd-reset")            // Bearer can reset their password
	TokenScopeConfirmEmail       = TokenScope("confirm-email")        // Bearer makes their account confirmed
	TokenScopeConfirmEmailUpdate = TokenScope("confirm-email-update") // Bearer confirms updating their email
	TokenScopeLogin              = TokenScope("login")                // Bearer is eligible for a one-time login
)

// Token is, well, a token
type Token struct {
	Value       string     `db:"value" goqu:"skipupdate"` // Token value, a random byte sequence, as a hex string
	Owner       uuid.UUID  `db:"user_id"`                 // UUID of the user owning the token. If zero (i.e. AnonymousUser.ID), the token is anonymous
	Scope       TokenScope `db:"scope"`                   // Token's scope
	ExpiresTime time.Time  `db:"ts_expires"`              // UTC timestamp of the expiration
	Multiuse    bool       `db:"multiuse"`                // Whether the token is to be kept until expired; if false, the token gets deleted after first use
}

// NewToken creates a new token instance. If owner == nil, an anonymous token is created
func NewToken(owner *uuid.UUID, scope TokenScope, maxAge time.Duration, multiuse bool) (*Token, error) {
	// If it's an anonymous token
	if owner == nil {
		owner = &AnonymousUser.ID
	}

	// Generate a random 32-byte value
	if b, err := util.RandomBytes(32); err != nil {
		return nil, err
	} else {
		return &Token{
				Value:       hex.EncodeToString(b),
				Owner:       *owner,
				Scope:       scope,
				ExpiresTime: time.Now().UTC().Add(maxAge),
				Multiuse:    multiuse,
			},
			nil
	}
}

// IsAnonymous returns whether the token is anonymous (i.e. belonging to an anonymous user)
func (t *Token) IsAnonymous() bool {
	return t.Owner == AnonymousUser.ID
}

// ValueBytes returns the token's value as a byte slice
func (t *Token) ValueBytes() ([]byte, error) {
	return hex.DecodeString(t.Value)
}

// ---------------------------------------------------------------------------------------------------------------------

// AuthSession holds information about federated authentication session
type AuthSession struct {
	ID          uuid.UUID `db:"id"`          // Unique session ID
	TokenValue  string    `db:"token_value"` // Reference to the anonymous token authenticated was initiated with, as a hex string
	Data        string    `db:"data"`        // Opaque serialised session data
	Host        string    `db:"host"`        // Optional source page host
	CreatedTime time.Time `db:"ts_created"`  // When the session was created
	ExpiresTime time.Time `db:"ts_expires"`  // When the session expires
}

// NewAuthSession instantiates a new AuthSession
func NewAuthSession(data, host string, token string) *AuthSession {
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
	ID                  uuid.UUID      `db:"id"`                                              // Unique user ID
	Email               string         `db:"email"`                                           // Unique user email
	Name                string         `db:"name"`                                            // User's full name
	LangID              string         `db:"lang_id"`                                         // User's interface language ID
	PasswordHash        string         `db:"password_hash"`                                   // Password hash
	SystemAccount       bool           `db:"system_account"`                                  // Whether the user is a system account (cannot sign in)
	IsSuperuser         bool           `db:"is_superuser"`                                    // Whether the user is a "superuser" (instance admin)
	Confirmed           bool           `db:"confirmed"`                                       // Whether the user's email has been confirmed
	ConfirmedTime       sql.NullTime   `db:"ts_confirmed"`                                    // When the user's email has been confirmed
	CreatedTime         time.Time      `db:"ts_created"`                                      // When the user was created
	UserCreated         uuid.NullUUID  `db:"user_created"`                                    // Reference to the user who created this one. null if the used signed up themselves
	SignupIP            string         `db:"signup_ip"`                                       // IP address the user signed up or was created from
	SignupCountry       string         `db:"signup_country"`                                  // 2-letter country code matching the SignupIP
	SignupHost          string         `db:"signup_host"`                                     // Host the user signed up on (only for commenter signup, empty for UI signup)
	Banned              bool           `db:"banned"`                                          // Whether the user is banned
	BannedTime          sql.NullTime   `db:"ts_banned"`                                       // When the user was banned
	UserBanned          uuid.NullUUID  `db:"user_banned"`                                     // Reference to the user who banned this one
	Remarks             string         `db:"remarks"`                                         // Optional remarks for the user
	FederatedIdP        sql.NullString `db:"federated_idp"`                                   // Optional ID of the federated identity provider used for authentication. If empty and FederatedSSO is false, it's a local user
	FederatedSSO        bool           `db:"federated_sso"`                                   // Whether the user is authenticated via SSO
	FederatedID         string         `db:"federated_id"`                                    // User ID as reported by the federated identity provider (only when FederatedIdP/FederatedSSO is set)
	WebsiteURL          string         `db:"website_url"`                                     // Optional user's website URL
	SecretToken         uuid.UUID      `db:"secret_token"`                                    // User's secret token, for example, for unsubscribing from notifications
	PasswordChangeTime  time.Time      `db:"ts_password_change"`                              // When the user last changed their password
	LastLoginTime       sql.NullTime   `db:"ts_last_login"`                                   // When the user last logged in successfully
	LastFailedLoginTime sql.NullTime   `db:"ts_last_failed_login"`                            // When the user last failed to log in due to wrong credentials
	FailedLoginAttempts int            `db:"failed_login_attempts"`                           // Number of failed login attempts
	IsLocked            bool           `db:"is_locked"`                                       // Whether the user is locked out
	LockedTime          sql.NullTime   `db:"ts_locked"`                                       // When the user was locked
	HasAvatar           bool           `db:"has_avatar"         goqu:"skipinsert,skipupdate"` // Whether the user has an avatar image. Calculated field populated only while loading from the DB
	CountDomainsOwned   int            `db:"owned_domain_count" goqu:"skipinsert,skipupdate"` // Number of domains the user owns (-1 means "unknown"). Calculated field populated only while loading from the DB
}

// NewUser instantiates a new User
func NewUser(email, name string) *User {
	return &User{
		ID:                uuid.New(),
		Email:             email,
		Name:              name,
		LangID:            util.DefaultLanguage.String(),
		CreatedTime:       time.Now().UTC(),
		SecretToken:       uuid.New(),
		CountDomainsOwned: -1,
	}
}

// CloneWithClearance returns a clone of the user with (possibly) a limited set of properties, depending on the
// specified authorisations
func (u *User) CloneWithClearance(isSuperuser, isOwner, isModerator bool) *User {
	// Superuser sees everything: make a perfect clone
	if isSuperuser {
		c := *u
		return &c
	}

	// Start with properties publicly available
	user := &User{
		ID:                u.ID,
		HasAvatar:         u.HasAvatar,
		Name:              u.Name,
		SystemAccount:     u.SystemAccount,
		WebsiteURL:        u.WebsiteURL,
		CountDomainsOwned: -1,
	}

	// Owner or moderator
	if isOwner || isModerator {
		user.Banned = u.Banned
		user.BannedTime = u.BannedTime
		user.Confirmed = u.Confirmed
		user.ConfirmedTime = u.ConfirmedTime
		user.CreatedTime = u.CreatedTime
		user.FederatedIdP = u.FederatedIdP
		user.FederatedSSO = u.FederatedSSO
		user.LangID = u.LangID
		user.SignupHost = u.SignupHost

		// Owner
		if isOwner {
			user.Email = u.Email
			user.LastLoginTime = u.LastLoginTime
			user.IsLocked = u.IsLocked
			user.LockedTime = u.LockedTime
		}
	}
	return user
}

// ColourIndex returns a hash-number based on the user's ID
func (u *User) ColourIndex() byte {
	// Sum all the bytes in the ID
	n := 0
	for _, b := range u.ID {
		n += int(b)
	}

	// Range to 0..ColourIndexCount-1
	return byte(n % ColourIndexCount)
}

// FromPluginUser updates this user model from the provided plugin model
func (u *User) FromPluginUser(pu *intf.User) {
	// ID is immutable
	u.WithName(pu.Name).
		WithLangID(pu.LangID).
		WithEmail(pu.Email).
		WithSuperuser(pu.IsSuperuser).
		WithConfirmed(pu.Confirmed).
		WithBanned(pu.Banned, nil).
		WithLocked(pu.IsLocked)
}

func (u *User) GetEmail() string {
	return u.Email
}

func (u *User) GetID() uuid.UUID {
	return u.ID
}

func (u *User) GetName() string {
	return u.Name
}

// IsAnonymous returns whether the user is anonymous
func (u *User) IsAnonymous() bool {
	return u.ID == AnonymousUser.ID
}

// IsLocal returns whether the user is local (as opposed to a federated one)
func (u *User) IsLocal() bool {
	return (!u.FederatedIdP.Valid || u.FederatedIdP.String == "") && !u.FederatedSSO
}

// ToCommenter converts this user into a Commenter model
func (u *User) ToCommenter(isCommenter, isModerator bool) *models.Commenter {
	return &models.Commenter{
		ColourIndex:  u.ColourIndex(),
		CreatedTime:  strfmt.DateTime(u.CreatedTime),
		Email:        strfmt.Email(u.Email),
		FederatedIDP: models.FederatedIdpID(u.FederatedIdP.String),
		FederatedSso: u.FederatedSSO,
		HasAvatar:    u.HasAvatar,
		ID:           strfmt.UUID(u.ID.String()),
		IsCommenter:  isCommenter,
		IsModerator:  isModerator,
		Name:         u.Name,
		WebsiteURL:   strfmt.URI(u.WebsiteURL),
	}
}

// ToDTO converts this user into an API model
func (u *User) ToDTO() *models.User {
	dto := &models.User{
		Banned:              u.Banned,
		BannedTime:          NullDateTime(u.BannedTime),
		ColourIndex:         u.ColourIndex(),
		Confirmed:           u.Confirmed,
		ConfirmedTime:       NullDateTime(u.ConfirmedTime),
		CreatedTime:         strfmt.DateTime(u.CreatedTime),
		Email:               strfmt.Email(u.Email),
		FailedLoginAttempts: int64(u.FailedLoginAttempts),
		FederatedID:         u.FederatedID,
		FederatedIDP:        models.FederatedIdpID(u.FederatedIdP.String),
		FederatedSso:        u.FederatedSSO,
		HasAvatar:           u.HasAvatar,
		ID:                  strfmt.UUID(u.ID.String()),
		IsLocked:            u.IsLocked,
		IsSuperuser:         u.IsSuperuser,
		LangID:              swag.String(u.LangID),
		LastFailedLoginTime: NullDateTime(u.LastFailedLoginTime),
		LastLoginTime:       NullDateTime(u.LastLoginTime),
		LockedTime:          NullDateTime(u.LockedTime),
		Name:                u.Name,
		PasswordChangeTime:  strfmt.DateTime(u.PasswordChangeTime),
		Remarks:             u.Remarks,
		SignupCountry:       u.SignupCountry,
		SignupHost:          u.SignupHost,
		SignupIP:            u.SignupIP,
		SystemAccount:       u.SystemAccount,
		UserBanned:          NullUUIDStr(&u.UserBanned),
		UserCreated:         NullUUIDStr(&u.UserCreated),
		WebsiteURL:          strfmt.URI(u.WebsiteURL),
	}
	if c := int64(u.CountDomainsOwned); c >= 0 {
		dto.CountDomainsOwned = &c
	}
	return dto
}

// ToPluginUser returns a new plugin.User instance for this user
func (u *User) ToPluginUser() *intf.User {
	return &intf.User{
		ID:          u.ID,
		Email:       u.Email,
		Name:        u.Name,
		LangID:      u.LangID,
		IsSuperuser: u.IsSuperuser,
		Confirmed:   u.Confirmed,
		Banned:      u.Banned,
		IsLocked:    u.IsLocked,
	}
}

// ToPrincipal converts this user into a Principal model. attr is the user's attribute map. du is an optional domain
// user model, which only applies to commenter authentication; should be nil for UI authentication
func (u *User) ToPrincipal(attr intf.AttrValues, du *DomainUser) *models.Principal {
	dto := &models.Principal{
		Attributes:          exmodels.KeyValueMap(attr),
		ColourIndex:         u.ColourIndex(),
		Email:               strfmt.Email(u.Email),
		HasAvatar:           u.HasAvatar,
		ID:                  strfmt.UUID(u.ID.String()),
		IsCommenter:         du.IsACommenter(),
		IsConfirmed:         u.Confirmed,
		IsLocal:             u.IsLocal(),
		IsModerator:         du.CanModerate(),
		IsOwner:             du.IsAnOwner(),
		IsSso:               u.FederatedSSO,
		IsSuperuser:         u.IsSuperuser,
		LangID:              u.LangID,
		Name:                u.Name,
		NotifyCommentStatus: du != nil && du.NotifyCommentStatus,
		NotifyModerator:     du != nil && du.NotifyModerator,
		NotifyReplies:       du != nil && du.NotifyReplies,
		WebsiteURL:          strfmt.URI(u.WebsiteURL),
	}
	if c := int64(u.CountDomainsOwned); c >= 0 {
		dto.CountDomainsOwned = &c
	}
	return dto
}

// VerifyPassword checks whether the provided password matches the hash
func (u *User) VerifyPassword(s string) bool {
	return bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(s)) == nil
}

// WithBanned sets the value of Banned, BannedTime, and UserBanned. byUser can be nil
func (u *User) WithBanned(b bool, byUser *uuid.UUID) *User {
	if u.Banned != b {
		u.Banned = b
		if b {
			u.BannedTime = NowNullable()
			u.UserBanned = *PtrToNullUUID(byUser)
		} else {
			u.BannedTime = sql.NullTime{}
			u.UserBanned = uuid.NullUUID{}
		}
	}
	return u
}

// WithConfirmed sets the value of Confirmed and ConfirmedTime
func (u *User) WithConfirmed(b bool) *User {
	if u.Confirmed != b {
		u.Confirmed = b
		if b {
			u.ConfirmedTime = NowNullable()
		} else {
			u.ConfirmedTime = sql.NullTime{}
		}
	}
	return u
}

// WithCreated sets the CreatedTime/UserCreated values
func (u *User) WithCreated(t time.Time, createdUserID *uuid.UUID) *User {
	u.CreatedTime = t
	u.UserCreated = uuid.NullUUID{UUID: *createdUserID, Valid: true}
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
	u.FederatedSSO = idpID == "" || idpID == "sso" // Prevent "sso" from being stored, it isn't a valid IdP ID
	if u.FederatedSSO {
		u.FederatedIdP = sql.NullString{}
	} else {
		u.FederatedIdP = sql.NullString{Valid: true, String: idpID}
	}
	return u
}

// WithLangID sets the LangID value
func (u *User) WithLangID(s string) *User {
	// Validate the language ID, falling back to the default if unparseable
	tag, err := language.Parse(s)
	if err != nil {
		tag = util.DefaultLanguage
	}
	u.LangID = tag.String()
	return u
}

// WithLangFromReq sets the user's LangID value based on the given HTTP request
func (u *User) WithLangFromReq(req *http.Request) *User {
	// Parse the Accept-Language header, falling back to the default if unparseable
	tag := util.DefaultLanguage
	if tags, _, err := language.ParseAcceptLanguage(req.Header.Get("Accept-Language")); err == nil && len(tags) > 0 {
		tag = tags[0]
	}
	u.LangID = tag.String()
	return u
}

// WithLastLogin updates the user's last login info (either successful or failed)
func (u *User) WithLastLogin(successful bool) *User {
	if successful {
		u.LastLoginTime = NowNullable()
		// Reset the failed attempt counter at the first successful auth
		u.FailedLoginAttempts = 0
	} else {
		u.LastFailedLoginTime = NowNullable()
		u.FailedLoginAttempts++
	}
	return u
}

// WithLocked sets the IsLocked/LockedTime values
func (u *User) WithLocked(b bool) *User {
	u.IsLocked = b
	if b {
		u.LockedTime = NowNullable()
	} else {
		u.LockedTime = sql.NullTime{}
		// Reset the failed attempt counter on unlock
		u.FailedLoginAttempts = 0
	}
	return u
}

// WithName sets the Name value
func (u *User) WithName(s string) *User {
	u.Name = s
	return u
}

// WithPassword updates the PasswordHash from the provided plain-text password. If s is empty, also sets the hash to
// empty
func (u *User) WithPassword(s string) *User {
	// If no password is provided, remove the hash. This means the user won't be able to log in
	if s == "" {
		u.PasswordHash = ""

		// Check if the password is actually changing
	} else if !u.VerifyPassword(s) {
		// Hash and save the password
		h, err := bcrypt.GenerateFromPassword([]byte(s), bcrypt.DefaultCost)
		if err != nil {
			panic(err)
		}
		u.PasswordChangeTime = time.Now().UTC()
		u.PasswordHash = string(h)
	}
	return u
}

// WithRemarks sets the Remarks value
func (u *User) WithRemarks(s string) *User {
	u.Remarks = s
	return u
}

// WithSignup sets the SignupIP and SignupCountry values based on the provided HTTP request and URL, optionally masking
// the IP
func (u *User) WithSignup(req *http.Request, url string, maskIP bool) *User {
	u.SignupIP, u.SignupCountry = util.UserIPCountry(req, maskIP)
	u.SignupHost = url
	return u
}

// WithSuperuser sets the IsSuperuser value
func (u *User) WithSuperuser(b bool) *User {
	u.IsSuperuser = b
	return u
}

// WithWebsiteURL sets the WebsiteURL value
func (u *User) WithWebsiteURL(s string) *User {
	u.WebsiteURL = s
	return u
}

// ---------------------------------------------------------------------------------------------------------------------

type UserAvatarSize byte

const (
	UserAvatarSizeS = 'S'
	UserAvatarSizeM = 'M'
	UserAvatarSizeL = 'L'
)

func UserAvatarSizeFromStr(s string) UserAvatarSize {
	if s != "" {
		return UserAvatarSize(s[0])
	}
	return UserAvatarSizeS
}

// UserAvatarSizes maps user avatar sizes to pixel sizes
var UserAvatarSizes = map[UserAvatarSize]int{UserAvatarSizeS: 16, UserAvatarSizeM: 32, UserAvatarSizeL: 128}

// UserAvatar represents a set of avatar images for a user
type UserAvatar struct {
	UserID      uuid.UUID `db:"user_id" goqu:"skipupdate"` // Unique user ID
	UpdatedTime time.Time `db:"ts_updated"`                // When the user was last updated
	IsCustom    bool      `db:"is_custom"`                 // Whether the user has customised their avatar, meaning it shouldn't be re-fetched from the IdP
	AvatarS     []byte    `db:"avatar_s"`                  // Small avatar image (16x16)
	AvatarM     []byte    `db:"avatar_m"`                  // Medium-sized avatar image (32x32)
	AvatarL     []byte    `db:"avatar_l"`                  // Large avatar image (128x128)
}

// Get returns an avatar image of the given size
func (ua *UserAvatar) Get(size UserAvatarSize) []byte {
	switch size {
	case UserAvatarSizeM:
		return ua.AvatarM

	case UserAvatarSizeL:
		return ua.AvatarL
	}

	// S is the default/fallback
	return ua.AvatarS
}

// Set store the given avatar image with the specified size
func (ua *UserAvatar) Set(size UserAvatarSize, data []byte) {
	switch size {
	case UserAvatarSizeM:
		ua.AvatarM = data
		return

	case UserAvatarSizeL:
		ua.AvatarL = data
		return
	}

	// S is the default/fallback
	ua.AvatarS = data
}

// ---------------------------------------------------------------------------------------------------------------------

// UserSession represents an authenticated user session
type UserSession struct {
	ID             uuid.UUID `db:"id"`                 // Unique session ID
	UserID         uuid.UUID `db:"user_id"`            // ID of the user who owns the session
	CreatedTime    time.Time `db:"ts_created"`         // When the session was created
	ExpiresTime    time.Time `db:"ts_expires"`         // When the session expires
	Host           string    `db:"host"`               // Host the session was created on (only for commenter login, empty for UI login)
	Proto          string    `db:"proto"`              // The protocol version, like "HTTP/1.0"
	IP             string    `db:"ip"`                 // IP address the session was created from
	Country        string    `db:"country"`            // 2-letter country code matching the ip
	BrowserName    string    `db:"ua_browser_name"`    // Name of the user's browser
	BrowserVersion string    `db:"ua_browser_version"` // Version of the user's browser
	OSName         string    `db:"ua_os_name"`         // Name of the user's OS
	OSVersion      string    `db:"ua_os_version"`      // Version of the user's OS
	Device         string    `db:"ua_device"`          // User's device type
}

// NewUserSession instantiates a new UserSession from the given request, optionally masking the IP
func NewUserSession(userID *uuid.UUID, host string, req *http.Request, maskIP bool) *UserSession {
	// Extract the remote IP and country
	ip, country := util.UserIPCountry(req, maskIP)

	// Parse the User Agent header
	ua := uasurfer.Parse(util.UserAgent(req))

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

// ToDTO converts this user session into an API model
func (us *UserSession) ToDTO() *models.UserSession {
	return &models.UserSession{
		BrowserName:    us.BrowserName,
		BrowserVersion: us.BrowserVersion,
		Country:        us.Country,
		CreatedTime:    strfmt.DateTime(us.CreatedTime),
		Device:         us.Device,
		ExpiresTime:    strfmt.DateTime(us.ExpiresTime),
		Host:           us.Host,
		ID:             strfmt.UUID(us.ID.String()),
		IP:             us.IP,
		OsName:         us.OSName,
		OsVersion:      us.OSVersion,
		Proto:          us.Proto,
		UserID:         strfmt.UUID(us.UserID.String()),
	}
}

// ---------------------------------------------------------------------------------------------------------------------

// DomainModNotifyPolicy describes moderator notification policy on a specific domain
type DomainModNotifyPolicy string

//goland:noinspection GoUnusedConst
const (
	DomainModNotifyPolicyNone    DomainModNotifyPolicy = "none"    // Do not notify domain moderators
	DomainModNotifyPolicyPending                       = "pending" // Only notify domain moderator about comments pending moderation
	DomainModNotifyPolicyAll                           = "all"     // Notify moderators about every comment
)

// Domain holds domain configuration
type Domain struct {
	ID                uuid.UUID             `db:"id"         goqu:"skipupdate"` // Unique record ID
	Name              string                `db:"name"`                         // Domain display name
	Host              string                `db:"host"       goqu:"skipupdate"` // Domain host
	CreatedTime       time.Time             `db:"ts_created" goqu:"skipupdate"` // When the domain was created
	IsHTTPS           bool                  `db:"is_https"`                     // Whether HTTPS should be used to resolve URLs on this domain (as opposed to HTTP)
	IsReadonly        bool                  `db:"is_readonly"`                  // Whether the domain is readonly (no new comments are allowed)
	AuthAnonymous     bool                  `db:"auth_anonymous"`               // Whether anonymous comments are allowed
	AuthLocal         bool                  `db:"auth_local"`                   // Whether local authentication is allowed
	AuthSSO           bool                  `db:"auth_sso"`                     // Whether SSO authentication is allowed
	SSOURL            string                `db:"sso_url"`                      // SSO provider URL
	SSOSecret         sql.NullString        `db:"sso_secret"`                   // SSO secret as a hex string
	SSONonInteractive bool                  `db:"sso_noninteractive"`           // Whether to use a non-interactive SSO login
	ModAnonymous      bool                  `db:"mod_anonymous"`                // Whether all anonymous comments are to be approved by a moderator
	ModAuthenticated  bool                  `db:"mod_authenticated"`            // Whether all non-anonymous comments are to be approved by a moderator
	ModNumComments    int                   `db:"mod_num_comments"`             // Number of first comments by user on this domain that require a moderator approval
	ModUserAgeDays    int                   `db:"mod_user_age_days"`            // Number of first days since user has registered on this domain to require a moderator approval on their comments
	ModLinks          bool                  `db:"mod_links"`                    // Whether all comments containing a link are to be approved by a moderator
	ModImages         bool                  `db:"mod_images"`                   // Whether all comments containing an image are to be approved by a moderator
	ModNotifyPolicy   DomainModNotifyPolicy `db:"mod_notify_policy"`            // Moderator notification policy for domain: 'none', 'pending', 'all'
	DefaultSort       string                `db:"default_sort"`                 // Default comment sorting for domain. 1st letter: s = score, t = timestamp; 2nd letter: a = asc, d = desc
	CountComments     int64                 `db:"count_comments"`               // Total number of comments
	CountViews        int64                 `db:"count_views"`                  // Total number of views
}

// CloneWithClearance returns a clone of the domain with a limited set of properties, depending on the specified
// authorisations
func (d *Domain) CloneWithClearance(isSuperuser, isOwner bool) *Domain {
	// Superuser and owner see everything: make a perfect clone
	if isSuperuser || isOwner {
		c := *d
		return &c
	}

	// Non-owner only sees what's publicly available
	return &Domain{
		ID:                d.ID,
		Host:              d.Host,
		IsHTTPS:           d.IsHTTPS,
		IsReadonly:        d.IsReadonly,
		AuthAnonymous:     d.AuthAnonymous,
		AuthLocal:         d.AuthLocal,
		AuthSSO:           d.AuthSSO,
		SSOURL:            d.SSOURL,
		SSONonInteractive: d.SSONonInteractive,
		DefaultSort:       d.DefaultSort,
		CountComments:     -1, // -1 indicates no count data is available
		CountViews:        -1, // idem
	}
}

// DisplayName returns the domain's display name, if set, otherwise the host
func (d *Domain) DisplayName() string {
	if d.Name != "" {
		return d.Name
	}
	return d.Host
}

// FromDTO updates this model from an API model. It omits fields that never originate from the DTO:
//   - ID
//   - CreatedTime
//   - CountComments
//   - CountViews
func (d *Domain) FromDTO(dto *models.Domain) {
	d.AuthAnonymous = dto.AuthAnonymous
	d.AuthLocal = dto.AuthLocal
	d.AuthSSO = dto.AuthSso
	d.DefaultSort = string(dto.DefaultSort)
	d.Host = strings.ToLower(strings.TrimSpace(string(dto.Host)))
	d.IsHTTPS = swag.BoolValue(dto.IsHTTPS)
	d.IsReadonly = dto.IsReadonly
	d.ModAnonymous = dto.ModAnonymous
	d.ModAuthenticated = dto.ModAuthenticated
	d.ModImages = dto.ModImages
	d.ModLinks = dto.ModLinks
	d.ModNotifyPolicy = DomainModNotifyPolicy(dto.ModNotifyPolicy)
	d.ModNumComments = int(dto.ModNumComments)
	d.ModUserAgeDays = int(dto.ModUserAgeDays)
	d.Name = dto.Name
	d.SSONonInteractive = dto.SsoNonInteractive
	d.SSOURL = dto.SsoURL
}

// RootURL returns the root URL of the domain, without the trailing slash
func (d *Domain) RootURL() string {
	return fmt.Sprintf("%s://%s", d.Scheme(), d.Host)
}

// Scheme returns the scheme of the domain, either HTTPS or HTTP
func (d *Domain) Scheme() string {
	return util.If(d.IsHTTPS, "https", "http")
}

// SSOSecretBytes returns the domain's SSO secret as a byte slice
func (d *Domain) SSOSecretBytes() ([]byte, error) {
	// If the value is null, no secret is set
	if !d.SSOSecret.Valid {
		return nil, nil
	}

	// Try to decode
	if b, err := hex.DecodeString(d.SSOSecret.String); err != nil {
		return nil, err
	} else if l := len(b); l != 32 {
		return nil, fmt.Errorf("invalid SSO secret bytes length %d, want 32", l)
	} else {
		// Succeeded
		return b, nil
	}
}

// SSOSecretNew generates a new SSO secret for the domain
func (d *Domain) SSOSecretNew() error {
	ss, err := util.RandomBytes(32)
	if err != nil {
		return err
	}
	d.SSOSecret = sql.NullString{Valid: true, String: hex.EncodeToString(ss)}
	return nil
}

// ToDTO converts this model into an API model
func (d *Domain) ToDTO() *models.Domain {
	return &models.Domain{
		AuthAnonymous:       d.AuthAnonymous,
		AuthLocal:           d.AuthLocal,
		AuthSso:             d.AuthSSO,
		CountComments:       d.CountComments,
		CountViews:          d.CountViews,
		CreatedTime:         strfmt.DateTime(d.CreatedTime),
		DefaultSort:         models.CommentSort(d.DefaultSort),
		Host:                models.Host(d.Host),
		ID:                  strfmt.UUID(d.ID.String()),
		IsHTTPS:             swag.Bool(d.IsHTTPS),
		IsReadonly:          d.IsReadonly,
		ModAnonymous:        d.ModAnonymous,
		ModAuthenticated:    d.ModAuthenticated,
		ModImages:           d.ModImages,
		ModLinks:            d.ModLinks,
		ModNotifyPolicy:     models.DomainModNotifyPolicy(d.ModNotifyPolicy),
		ModNumComments:      uint64(d.ModNumComments),
		ModUserAgeDays:      uint64(d.ModUserAgeDays),
		Name:                d.Name,
		RootURL:             strfmt.URI(d.RootURL()),
		SsoNonInteractive:   d.SSONonInteractive,
		SsoSecretConfigured: d.SSOSecret.Valid,
		SsoURL:              d.SSOURL,
	}
}

// ---------------------------------------------------------------------------------------------------------------------

// DomainUser represents user configuration in a specific domain
type DomainUser struct {
	DomainID            uuid.UUID `db:"domain_id"  goqu:"skipupdate"` // ID of the domain
	UserID              uuid.UUID `db:"user_id"    goqu:"skipupdate"` // ID of the user
	IsOwner             bool      `db:"is_owner"`                     // Whether the user is an owner of the domain (assumes is_moderator and is_commenter)
	IsModerator         bool      `db:"is_moderator"`                 // Whether the user is a moderator of the domain (assumes is_commenter)
	IsCommenter         bool      `db:"is_commenter"`                 // Whether the user is a commenter of the domain (if false, the user is readonly on the domain)
	NotifyReplies       bool      `db:"notify_replies"`               // Whether the user is to be notified about replies to their comments
	NotifyModerator     bool      `db:"notify_moderator"`             // Whether the user is to receive moderator notifications (only when is_moderator is true)
	NotifyCommentStatus bool      `db:"notify_comment_status"`        // Whether the user is to be notified about status changes (approved/rejected) of their comments
	CreatedTime         time.Time `db:"ts_created" goqu:"skipupdate"` // When the domain user was created
}

// NewDomainUser creates a new DomainUser instance, with all notifications enabled
func NewDomainUser(domainID, userID *uuid.UUID, owner, moderator, commenter bool) *DomainUser {
	return &DomainUser{
		DomainID:            *domainID,
		UserID:              *userID,
		IsOwner:             owner,
		IsModerator:         moderator,
		IsCommenter:         commenter,
		NotifyReplies:       true,
		NotifyModerator:     true,
		NotifyCommentStatus: true,
		CreatedTime:         time.Now().UTC(),
	}
}

// AgeInDays returns the number of full days passed since the user was created. Can be called against a nil receiver
func (du *DomainUser) AgeInDays() int {
	if du == nil {
		return 0
	}
	return int(time.Now().UTC().Sub(du.CreatedTime) / util.OneDay)
}

// CanModerate returns whether the domain user is an owner or a moderator. Can be called against a nil receiver, in
// which case returns false
func (du *DomainUser) CanModerate() bool {
	return du != nil && (du.IsOwner || du.IsModerator)
}

// IsACommenter returns whether the domain user is a commenter. Can be called against a nil receiver, which is
// interpreted as no domain user has been created yet for this specific user, so it returns true, because the user is
// assumed to have the default (commenter) role
func (du *DomainUser) IsACommenter() bool {
	return du == nil || du.IsCommenter
}

// IsAModerator returns whether the domain user is a moderator. Can be called against a nil receiver, in which case
// returns false
func (du *DomainUser) IsAModerator() bool {
	return du != nil && du.IsModerator
}

// IsAnOwner returns whether the domain user is an owner. Can be called against a nil receiver, in which case returns
// false
func (du *DomainUser) IsAnOwner() bool {
	return du != nil && du.IsOwner
}

// IsReadonly returns whether the domain user is not allowed to comment (is readonly). Can be called against a nil
// receiver, which is interpreted as no domain user has been created yet for this specific user hence they're NOT
// readonly
func (du *DomainUser) IsReadonly() bool {
	return du != nil && !du.IsOwner && !du.IsModerator && !du.IsCommenter
}

// Role returns a named domain user role. Can be called against a nil receiver, in which case returns empty string
func (du *DomainUser) Role() models.DomainUserRole {
	switch {
	case du == nil:
		return ""
	case du.IsOwner:
		return models.DomainUserRoleOwner
	case du.IsModerator:
		return models.DomainUserRoleModerator
	case du.IsCommenter:
		return models.DomainUserRoleCommenter
	default:
		return models.DomainUserRoleReadonly
	}
}

// ToDTO converts this model into an API model. Can be called against a nil receiver
func (du *DomainUser) ToDTO() *models.DomainUser {
	if du == nil {
		return nil
	}
	return &models.DomainUser{
		CreatedTime:         strfmt.DateTime(du.CreatedTime),
		DomainID:            strfmt.UUID(du.DomainID.String()),
		NotifyCommentStatus: du.NotifyCommentStatus,
		NotifyModerator:     du.NotifyModerator,
		NotifyReplies:       du.NotifyReplies,
		Role:                du.Role(),
		UserID:              strfmt.UUID(du.UserID.String()),
	}
}

// WithCreated sets the CreatedTime value
func (du *DomainUser) WithCreated(t time.Time) *DomainUser {
	du.CreatedTime = t
	return du
}

// WithNotifyCommentStatus sets the NotifyCommentStatus value
func (du *DomainUser) WithNotifyCommentStatus(b bool) *DomainUser {
	du.NotifyCommentStatus = b
	return du
}

// WithNotifyModerator sets the NotifyModerator value
func (du *DomainUser) WithNotifyModerator(b bool) *DomainUser {
	du.NotifyModerator = b
	return du
}

// WithNotifyReplies sets the NotifyReplies value
func (du *DomainUser) WithNotifyReplies(b bool) *DomainUser {
	du.NotifyReplies = b
	return du
}

// WithRole sets the named role by updating the user's role flags
func (du *DomainUser) WithRole(r models.DomainUserRole) *DomainUser {
	switch owner, moderator, commenter := false, false, false; r {
	case models.DomainUserRoleOwner:
		owner = true
		fallthrough
	case models.DomainUserRoleModerator:
		moderator = true
		fallthrough
	case models.DomainUserRoleCommenter:
		commenter = true
		fallthrough
	case models.DomainUserRoleReadonly:
		// Apply the role flags here (thus ignoring any invalid/unknown role)
		du.IsOwner = owner
		du.IsModerator = moderator
		du.IsCommenter = commenter
	}
	return du
}

// ---------------------------------------------------------------------------------------------------------------------

// NullDomainUser is the same as DomainUser, but "optional", ie. having all fields nullable, and with the "du_" column
// prefix meant for (outer) joins
type NullDomainUser struct {
	DomainID            uuid.NullUUID `db:"du_domain_id"`
	UserID              uuid.NullUUID `db:"du_user_id"`
	IsOwner             sql.NullBool  `db:"du_is_owner"`
	IsModerator         sql.NullBool  `db:"du_is_moderator"`
	IsCommenter         sql.NullBool  `db:"du_is_commenter"`
	NotifyReplies       sql.NullBool  `db:"du_notify_replies"`
	NotifyModerator     sql.NullBool  `db:"du_notify_moderator"`
	NotifyCommentStatus sql.NullBool  `db:"du_notify_comment_status"`
	CreatedTime         sql.NullTime  `db:"du_ts_created"`
}

// ToDomainUser returns either nil if the object is nil or has a null ID, or a new DomainUser with all the field values
func (n *NullDomainUser) ToDomainUser() *DomainUser {
	if n == nil || !n.UserID.Valid {
		return nil
	}
	return NewDomainUser(&n.DomainID.UUID, &n.UserID.UUID, n.IsOwner.Bool, n.IsModerator.Bool, n.IsCommenter.Bool).
		WithNotifyReplies(n.NotifyReplies.Bool).
		WithNotifyModerator(n.NotifyModerator.Bool).
		WithNotifyCommentStatus(n.NotifyCommentStatus.Bool).
		WithCreated(n.CreatedTime.Time)
}

// ---------------------------------------------------------------------------------------------------------------------

// DomainPage represents a page on a specific domain
type DomainPage struct {
	ID            uuid.UUID `db:"id"             goqu:"skipupdate"` // Unique record ID
	DomainID      uuid.UUID `db:"domain_id"      goqu:"skipupdate"` // ID of the domain
	Path          string    `db:"path"`                             // Page path
	Title         string    `db:"title"`                            // Page title
	IsReadonly    bool      `db:"is_readonly"`                      // Whether the page is readonly (no new comments are allowed)
	CreatedTime   time.Time `db:"ts_created"     goqu:"skipupdate"` // When the record was created
	CountComments int64     `db:"count_comments"`                   // Total number of comments
	CountViews    int64     `db:"count_views"`                      // Total number of views
}

// CloneWithClearance returns a clone of the page with a limited set of properties, depending on the specified
// authorisations
func (p *DomainPage) CloneWithClearance(isSuperuser, isOwner bool) *DomainPage {
	// Superuser and owner see everything: make a perfect clone
	if isSuperuser || isOwner {
		c := *p
		return &c
	}

	// Non-owner only sees what's publicly available
	return &DomainPage{
		ID:            p.ID,
		DomainID:      p.DomainID,
		IsReadonly:    p.IsReadonly,
		Path:          p.Path,
		Title:         p.Title,
		CountComments: -1, // -1 indicates no count data is available
		CountViews:    -1, // idem
	}
}

// DisplayTitle returns a display title of the page: either its title if it's set, otherwise the domain's host and path
func (p *DomainPage) DisplayTitle(domain *Domain) string {
	if p.Title != "" {
		return p.Title
	}
	return domain.Host + p.Path
}

// ToDTO converts this model into an API model
func (p *DomainPage) ToDTO() *models.DomainPage {
	return &models.DomainPage{
		CountComments: p.CountComments,
		CountViews:    p.CountViews,
		CreatedTime:   strfmt.DateTime(p.CreatedTime),
		DomainID:      strfmt.UUID(p.DomainID.String()),
		ID:            strfmt.UUID(p.ID.String()),
		IsReadonly:    swag.Bool(p.IsReadonly),
		Path:          models.Path(p.Path),
		Title:         p.Title,
	}
}

// WithIsReadonly sets the IsReadonly value
func (p *DomainPage) WithIsReadonly(b bool) *DomainPage {
	p.IsReadonly = b
	return p
}

// WithPath sets the Path value
func (p *DomainPage) WithPath(s string) *DomainPage {
	p.Path = s
	return p
}

// WithTitle sets the Title value
func (p *DomainPage) WithTitle(s string) *DomainPage {
	p.Title = util.TruncateStr(s, MaxPageTitleLength) // Make sure the title doesn't exceed the size of the database field
	return p
}

// ---------------------------------------------------------------------------------------------------------------------

// DomainPageView is a domain page view database record
type DomainPageView struct {
	PageID         uuid.UUID `db:"page_id"`            // Reference to the page
	CreatedTime    time.Time `db:"ts_created"`         // When the record was created
	Proto          string    `db:"proto"`              // The protocol version, like "HTTP/1.0"
	IP             string    `db:"ip"`                 // IP address the session was created from
	Country        string    `db:"country"`            // 2-letter country code matching the ip
	BrowserName    string    `db:"ua_browser_name"`    // Name of the user's browser
	BrowserVersion string    `db:"ua_browser_version"` // Version of the user's browser
	OSName         string    `db:"ua_os_name"`         // Name of the user's OS
	OSVersion      string    `db:"ua_os_version"`      // Version of the user's OS
	Device         string    `db:"ua_device"`          // User's device type
}

// ---------------------------------------------------------------------------------------------------------------------

// Comment represents a comment
type Comment struct {
	ID            uuid.UUID     `db:"id"`             // Unique record ID
	ParentID      uuid.NullUUID `db:"parent_id"`      // Parent record ID, null if it's a root comment on the page
	PageID        uuid.UUID     `db:"page_id"`        // Reference to the page
	Markdown      string        `db:"markdown"`       // Comment text in markdown
	HTML          string        `db:"html"`           // Rendered comment text in HTML
	Score         int           `db:"score"`          // Comment score
	IsSticky      bool          `db:"is_sticky"`      // Whether the comment is sticky (attached to the top of page)
	IsApproved    bool          `db:"is_approved"`    // Whether the comment is approved and can be seen by everyone
	IsPending     bool          `db:"is_pending"`     // Whether the comment is pending approval
	IsDeleted     bool          `db:"is_deleted"`     // Whether the comment is marked as deleted
	CreatedTime   time.Time     `db:"ts_created"`     // When the comment was created
	ModeratedTime sql.NullTime  `db:"ts_moderated"`   // When a moderation action has last been applied to the comment
	DeletedTime   sql.NullTime  `db:"ts_deleted"`     // When the comment was marked as deleted
	EditedTime    sql.NullTime  `db:"ts_edited"`      // When the comment text was last updated
	UserCreated   uuid.NullUUID `db:"user_created"`   // Reference to the user who created the comment
	UserModerated uuid.NullUUID `db:"user_moderated"` // Reference to the user who last moderated the comment
	UserDeleted   uuid.NullUUID `db:"user_deleted"`   // Reference to the user who deleted the comment
	UserEdited    uuid.NullUUID `db:"user_edited"`    // Reference to the user who last updated the comment text
	PendingReason string        `db:"pending_reason"` // The reason for the pending status
	AuthorName    string        `db:"author_name"`    // Name of the author, in case the user isn't registered
	AuthorIP      string        `db:"author_ip"`      // IP address of the author
	AuthorCountry string        `db:"author_country"` // 2-letter country code matching the AuthorIP
}

// CloneWithClearance returns a clone of the comment with a limited set of properties, depending on the specified
// authorisations. domainUser can be nil
func (c *Comment) CloneWithClearance(user *User, domainUser *DomainUser) *Comment {
	// Superuser sees everything, domain owner/moderator everything except the IP
	if user.IsSuperuser || domainUser.CanModerate() {
		cc := *c
		if !user.IsSuperuser {
			cc.AuthorIP = ""
		}
		return &cc
	}

	// Other users don't see the source Markdown and status/audit fields, except for the edited/deleted time
	cc := &Comment{
		ID:          c.ID,
		ParentID:    c.ParentID,
		PageID:      c.PageID,
		HTML:        c.HTML,
		Score:       c.Score,
		IsSticky:    c.IsSticky,
		IsApproved:  c.IsApproved,
		IsDeleted:   c.IsDeleted,
		CreatedTime: c.CreatedTime,
		UserCreated: c.UserCreated,
		DeletedTime: c.DeletedTime,
		EditedTime:  c.EditedTime,
		AuthorName:  c.AuthorName,
	}

	if c.UserCreated.Valid {
		// Comment author can see a bit more
		if c.UserCreated.UUID == user.ID {
			cc.Markdown = c.Markdown
			cc.IsPending = c.IsPending
			cc.ModeratedTime = c.ModeratedTime
		}

		// Audit user fields are visible only if they point to the comment author
		if c.UserModerated.Valid && c.UserModerated.UUID == c.UserCreated.UUID {
			cc.UserModerated = c.UserModerated
		}
		if c.UserDeleted.Valid && c.UserDeleted.UUID == c.UserCreated.UUID {
			cc.UserDeleted = c.UserDeleted
		}
		if c.UserEdited.Valid && c.UserEdited.UUID == c.UserCreated.UUID {
			cc.UserEdited = c.UserEdited
		}
	}
	return cc
}

// IsAnonymous returns whether the comment is authored by an anonymous or nonexistent (deleted) commenter
func (c *Comment) IsAnonymous() bool {
	return !c.UserCreated.Valid || c.UserCreated.UUID == AnonymousUser.ID
}

// IsRoot returns whether it's a root comment (i.e. its parent ID is null)
func (c *Comment) IsRoot() bool {
	return !c.ParentID.Valid
}

// ToDTO converts this model into an API model:
//   - https is true for "https", false for "http"
//   - host is the domain host
//   - path is the page path
//
// NB: leaves the Direction at 0
func (c *Comment) ToDTO(https bool, host, path string) *models.Comment {
	return &models.Comment{
		AuthorCountry: c.AuthorCountry,
		AuthorIP:      c.AuthorIP,
		AuthorName:    c.AuthorName,
		CreatedTime:   strfmt.DateTime(c.CreatedTime),
		DeletedTime:   NullDateTime(c.DeletedTime),
		EditedTime:    NullDateTime(c.EditedTime),
		HTML:          c.HTML,
		ID:            strfmt.UUID(c.ID.String()),
		IsApproved:    c.IsApproved,
		IsDeleted:     c.IsDeleted,
		IsPending:     c.IsPending,
		IsSticky:      c.IsSticky,
		Markdown:      c.Markdown,
		ModeratedTime: NullDateTime(c.ModeratedTime),
		PageID:        strfmt.UUID(c.PageID.String()),
		ParentID:      NullUUIDStr(&c.ParentID),
		PendingReason: c.PendingReason,
		Score:         int64(c.Score),
		URL:           strfmt.URI(c.URL(https, host, path)),
		UserCreated:   NullUUIDStr(&c.UserCreated),
		UserDeleted:   NullUUIDStr(&c.UserDeleted),
		UserEdited:    NullUUIDStr(&c.UserEdited),
		UserModerated: NullUUIDStr(&c.UserModerated),
	}
}

// URL returns the absolute URL of the comment
func (c *Comment) URL(https bool, host, path string) string {
	return fmt.Sprintf("%s://%s%s#comentario-%s", util.If(https, "https", "http"), host, path, c.ID)
}

// WithModerated sets the moderation status values. userID can be nil
func (c *Comment) WithModerated(userID *uuid.UUID, pending, approved bool, reason string) *Comment {
	c.IsPending = pending
	c.IsApproved = approved
	c.PendingReason = util.TruncateStr(reason, MaxPendingReasonLength)
	if userID != nil {
		c.UserModerated = uuid.NullUUID{UUID: *userID, Valid: true}
		c.ModeratedTime = NowNullable()
	}
	return c
}

// ---------------------------------------------------------------------------------------------------------------------

// CommentVote represents a comment vote database record
type CommentVote struct {
	CommentID  uuid.UUID `db:"comment_id" goqu:"skipupdate"` // Reference to the comment
	UserID     uuid.UUID `db:"user_id"    goqu:"skipupdate"` // Reference to the user
	IsNegative bool      `db:"negative"`                     // Whether the vote is negative (true) or positive (false)
	VotedTime  time.Time `db:"ts_voted"`                     // When the vote was created or updated
}

// ---------------------------------------------------------------------------------------------------------------------

// DomainExtension represents a known domain extension
type DomainExtension struct {
	ID          models.DomainExtensionID // Extension ID
	Name        string                   // Extension display name
	Config      string                   // Extension configuration, linebreak-separated list of key=value pairs
	KeyRequired bool                     // Whether the extension requires an API key to be usable
	KeyProvided bool                     // Whether an API key is globally provided for the extension
	Enabled     bool                     // Whether the extension is globally enabled
}

// ConfigParams returns the extension configuration parsed into a parameter map
func (de *DomainExtension) ConfigParams() map[string]string {
	params := make(map[string]string)
	for _, kv := range strings.Split(de.Config, "\n") {
		// Ignore comments and empty lines
		if kv == "" || strings.HasPrefix(kv, "#") {
			continue
		}

		// Split the key=value pair
		parts := strings.SplitN(kv, "=", 2)
		if len(parts) == 2 {
			// Remove all leading/trailing whitespace from the key and the value
			if k := strings.TrimSpace(parts[0]); k != "" {
				params[k] = strings.TrimSpace(parts[1])
			}
		}
	}
	return params
}

// HasDefaultConfig returns whether the extension has a configuration matching the default
func (de *DomainExtension) HasDefaultConfig() bool {
	if ex, ok := DomainExtensions[de.ID]; ok && strings.TrimSpace(de.Config) == ex.Config {
		return true
	}
	return false
}

// ToDTO converts this model into an API model
func (de *DomainExtension) ToDTO() *models.DomainExtension {
	return &models.DomainExtension{
		ID:          de.ID,
		Name:        de.Name,
		Config:      de.Config,
		RequiresKey: swag.Bool(de.KeyRequired && !de.KeyProvided),
	}
}

// DomainExtensions is a map of known domain extensions and their default configurations. All disabled initially
var DomainExtensions = map[models.DomainExtensionID]*DomainExtension{
	models.DomainExtensionIDAkismet: {
		ID:          models.DomainExtensionIDAkismet,
		Name:        "Akismet",
		Config:      "#apiKey=...",
		KeyRequired: true,
	},
	models.DomainExtensionIDPerspective: {
		ID:          models.DomainExtensionIDPerspective,
		Name:        "Perspective",
		Config:      "#apiKey=...\ntoxicity=0.5\nsevereToxicity=0.5\nidentityAttack=0.5\ninsult=0.5\nprofanity=0.5\nthreat=0.5",
		KeyRequired: true,
	},
	models.DomainExtensionIDAPILayerDotSpamChecker: {
		ID:          models.DomainExtensionIDAPILayerDotSpamChecker,
		Name:        "APILayer SpamChecker",
		Config:      "#apiKey=...\nthreshold=5",
		KeyRequired: true,
	},
}

// ---------------------------------------------------------------------------------------------------------------------

// DomainExtensionConfig represents a domain extension configured for a specific domain
type DomainExtensionConfig struct {
	DomainID    uuid.UUID                `db:"domain_id"`    // Reference to the domain
	ExtensionID models.DomainExtensionID `db:"extension_id"` // Extension ID
	Config      string                   `db:"config"`       // Extension configuration parameters
}
