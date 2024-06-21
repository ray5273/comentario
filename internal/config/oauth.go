package config

import (
	"fmt"
	"github.com/markbates/goth"
	"github.com/markbates/goth/providers/facebook"
	"github.com/markbates/goth/providers/github"
	"github.com/markbates/goth/providers/gitlab"
	"github.com/markbates/goth/providers/google"
	"github.com/markbates/goth/providers/openidConnect"
	"github.com/markbates/goth/providers/twitter"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/data"
	"strings"
)

// FederatedIdProviders accumulates information about all supported ID providers
var FederatedIdProviders = map[models.FederatedIdpID]*data.FederatedIdentityProvider{
	// Predefined providers
	"facebook": {ID: "facebook", Name: "Facebook", GothName: "facebook"},
	"github":   {ID: "github", Name: "GitHub", GothName: "github"},
	"gitlab":   {ID: "gitlab", Name: "GitLab", GothName: "gitlab"},
	"google":   {ID: "google", Name: "Google", GothName: "google"},
	"twitter":  {ID: "twitter", Name: "Twitter", GothName: "twitter"},
}

// GetFederatedIdP returns whether federated identity provider is known and configured, and if yes, its Provider
// interface
func GetFederatedIdP(id models.FederatedIdpID) (known, configured bool, provider goth.Provider, fidp *data.FederatedIdentityProvider) {
	// Look up the IdP
	if fidp, known = FederatedIdProviders[id]; !known {
		return
	}

	// IdP found, now verify it's configured
	provider, err := goth.GetProvider(fidp.GothName)
	configured = err == nil
	return
}

// oauthConfigure configures federated (OAuth) authentication
func oauthConfigure() error {
	facebookOauthConfigure()
	githubOauthConfigure()
	gitlabOauthConfigure()
	googleOauthConfigure()
	twitterOauthConfigure()
	return oidcConfigure()
}

// oauthCallbackURL returns the full callback URL for the provider with the given ID
func oauthCallbackURL(id string) string {
	return ServerConfig.URLForAPI(fmt.Sprintf("oauth/%s/callback", id), nil)
}

// facebookOauthConfigure configures federated authentication via Facebook
func facebookOauthConfigure() {
	if !SecretsConfig.IdP.Facebook.Usable() {
		logger.Debug("Facebook auth isn't configured or enabled")
		return
	}

	logger.Infof("Registering Facebook OAuth2 provider for client %s", SecretsConfig.IdP.Facebook.Key)
	goth.UseProviders(
		facebook.New(
			SecretsConfig.IdP.Facebook.Key,
			SecretsConfig.IdP.Facebook.Secret,
			oauthCallbackURL("facebook"),
			"email",
			"public_profile"),
	)
}

// githubOauthConfigure configures federated authentication via GitHub
func githubOauthConfigure() {
	if !SecretsConfig.IdP.GitHub.Usable() {
		logger.Debug("GitHub auth isn't configured or enabled")
		return
	}

	logger.Infof("Registering GitHub OAuth2 provider for client %s", SecretsConfig.IdP.GitHub.Key)
	goth.UseProviders(
		github.New(
			SecretsConfig.IdP.GitHub.Key,
			SecretsConfig.IdP.GitHub.Secret,
			oauthCallbackURL("github"),
			"read:user",
			"user:email"),
	)
}

// gitlabEndpointURL returns a (custom) GitLab URL for the given path (which must start with a '/')
func gitlabEndpointURL(path string) string {
	return strings.TrimSuffix(ServerConfig.GitLabURL, "/") + path
}

// gitlabOauthConfigure configures federated authentication via GitLab
func gitlabOauthConfigure() {
	if !SecretsConfig.IdP.GitLab.Usable() {
		logger.Debug("GitLab auth isn't configured or enabled")
		return
	}

	logger.Infof("Registering GitLab OAuth2 provider for client %s", SecretsConfig.IdP.GitLab.Key)

	// Customise the endpoint, if a custom GitLab URL is given
	if ServerConfig.GitLabURL != "" {
		gitlab.AuthURL = gitlabEndpointURL("/oauth/authorize")
		gitlab.TokenURL = gitlabEndpointURL("/oauth/token")
		gitlab.ProfileURL = gitlabEndpointURL("/api/v4/user")
	}
	goth.UseProviders(
		gitlab.New(
			SecretsConfig.IdP.GitLab.Key,
			SecretsConfig.IdP.GitLab.Secret,
			oauthCallbackURL("gitlab"),
			"read_user"),
	)
}

// googleOauthConfigure configures federated authentication via Google
func googleOauthConfigure() {
	if !SecretsConfig.IdP.Google.Usable() {
		logger.Debug("Google auth isn't configured or enabled")
		return
	}

	logger.Infof("Registering Google OAuth2 provider for client %s", SecretsConfig.IdP.Google.Key)
	goth.UseProviders(
		google.New(
			SecretsConfig.IdP.Google.Key,
			SecretsConfig.IdP.Google.Secret,
			oauthCallbackURL("google"),
			"email",
			"profile"),
	)
}

// twitterOauthConfigure configures federated authentication via Twitter
func twitterOauthConfigure() {
	if !SecretsConfig.IdP.Twitter.Usable() {
		logger.Debug("Twitter auth isn't configured or enabled")
		return
	}

	logger.Infof("Registering Twitter OAuth2 provider for client %s", SecretsConfig.IdP.Twitter.Key)
	goth.UseProviders(
		twitter.New(
			SecretsConfig.IdP.Twitter.Key,
			SecretsConfig.IdP.Twitter.Secret,
			oauthCallbackURL("twitter")),
	)
}

// oidcConfigure configures federated authentication via OIDC providers
func oidcConfigure() error {
	cnt := 0
	for _, p := range SecretsConfig.IdP.OIDC {
		// Skip unusable ones
		if !p.Usable() {
			continue
		}

		// Instantiate a new OIDC provider. This will also retrieve its configuration via discovery
		qid := p.QualifiedID()
		op, err := openidConnect.NewNamed(
			p.ID,
			p.Key,
			p.Secret,
			oauthCallbackURL(qid),
			strings.TrimSuffix(p.URL, "/")+"/.well-known/openid-configuration",
			p.Scopes...)
		if err != nil {
			return fmt.Errorf("failed to add OIDC provider (ID=%q): %w", p.ID, err)
		}

		// Set the name explicitly to override goth's name assigning logic that adds a suffix
		op.SetName(qid)

		// Register the provider
		logger.Infof("Registering OIDC provider (ID=%q) for client %s", p.ID, p.Key)
		goth.UseProviders(op)

		// Add it to the configured providers map
		mid := models.FederatedIdpID(qid)
		FederatedIdProviders[mid] = &data.FederatedIdentityProvider{
			ID:       mid,
			Name:     p.Name,
			GothName: qid,
		}
		cnt++
	}

	// If no configure providers available
	if cnt == 0 {
		logger.Debug("No OIDC providers configured or enabled")
	}
	return nil
}
