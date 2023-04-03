package data

import (
	"github.com/go-openapi/strfmt"
	"gitlab.com/comentario/comentario/internal/api/models"
	"golang.org/x/crypto/bcrypt"
	"time"
)

const RootParentHexID = models.ParentHexID("root") // The "root" parent hex

// AnonymousCommenter is a fake, anonymous, commenter instance, which doesn't exist in the database, but is nonetheless
// referenced by comments ¯\_(ツ)_/¯
var AnonymousCommenter = UserCommenter{
	User: User{
		HexID: "0000000000000000000000000000000000000000000000000000000000000000",
		Name:  "Anonymous",
	},
}

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

// Principal represents user's identity for the API
type Principal interface {
	// GetHexID returns the underlying user's hex ID
	GetHexID() models.HexID
	// GetUser returns the underlying User instance
	GetUser() *User
	// IsAnonymous returns whether the underlying user is anonymous
	IsAnonymous() bool
	// SetPassword updates the PasswordHash from the provided plain-test password. If s is empty, also sets the hash to
	// empty
	SetPassword(s string) error
	// VerifyPassword checks whether the provided password matches the hash
	VerifyPassword(s string) bool
}

// User is a base user type
type User struct {
	HexID        models.HexID // User hex ID
	Email        string       // User's email
	Created      time.Time    // Timestamp when user was created, in UTC
	Name         string       // User's full name
	PasswordHash string       // User's hashed password
}

func (u *User) GetHexID() models.HexID {
	return u.HexID
}

func (u *User) GetUser() *User {
	return u
}

func (u *User) IsAnonymous() bool {
	return u.HexID == AnonymousCommenter.HexID
}

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

func (u *User) VerifyPassword(s string) bool {
	return bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(s)) == nil
}

// ---------------------------------------------------------------------------------------------------------------------

// UserOwner represents a user that is a domain owner
type UserOwner struct {
	User
	EmailConfirmed bool // Whether the user's email is confirmed
}

// ToAPIModel converts this user into a principal API model
func (u *UserOwner) ToAPIModel() *models.Principal {
	return &models.Principal{
		IsConfirmed: u.EmailConfirmed,
		Email:       strfmt.Email(u.Email),
		Name:        u.Name,
		ID:          u.HexID,
	}
}

// ---------------------------------------------------------------------------------------------------------------------

// UserCommenter represents a commenter user
type UserCommenter struct {
	User
	IsModerator bool   // Whether the user is a moderator
	WebsiteURL  string // User's website link
	PhotoURL    string // URL of the user's avatar image
	Provider    string // User's federated provider ID
}

// ToCommenter converts this user into models.Commenter model
func (u *UserCommenter) ToCommenter() *models.Commenter {
	return &models.Commenter{
		CommenterHex: u.HexID,
		Email:        strfmt.Email(u.Email),
		IsModerator:  u.IsModerator,
		JoinDate:     strfmt.DateTime(u.Created),
		WebsiteURL:   strfmt.URI(u.WebsiteURL),
		Name:         u.Name,
		AvatarURL:    strfmt.URI(u.PhotoURL),
		Provider:     u.Provider,
	}
}
