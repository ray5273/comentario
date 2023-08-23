package config

import (
	"github.com/markbates/goth"
	"github.com/markbates/goth/providers/facebook"
	"github.com/markbates/goth/providers/github"
	"github.com/markbates/goth/providers/gitlab"
	"github.com/markbates/goth/providers/google"
	"github.com/markbates/goth/providers/linkedin"
	"github.com/markbates/goth/providers/twitter"
	"strings"
)

// oauthConfigure configures federated (OAuth) authentication
func oauthConfigure() {
	facebookOauthConfigure()
	githubOauthConfigure()
	gitlabOauthConfigure()
	googleOauthConfigure()
	linkedinOauthConfigure()
	twitterOauthConfigure()
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
			URLForAPI("oauth/facebook/callback", nil),
			"read:user",
			"user:email"),
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
			URLForAPI("oauth/github/callback", nil),
			"read:user",
			"user:email"),
	)
}

// gitlabEndpointURL returns a (custom) GitLab URL for the given path (which must start with a '/')
func gitlabEndpointURL(path string) string {
	return strings.TrimSuffix(CLIFlags.GitLabURL, "/") + path
}

// gitlabOauthConfigure configures federated authentication via GitLab
func gitlabOauthConfigure() {
	if !SecretsConfig.IdP.GitLab.Usable() {
		logger.Debug("GitLab auth isn't configured or enabled")
		return
	}

	logger.Infof("Registering GitLab OAuth2 provider for client %s", SecretsConfig.IdP.GitLab.Key)

	// Customise the endpoint, if a custom GitLab URL is given
	if CLIFlags.GitLabURL != "" {
		gitlab.AuthURL = gitlabEndpointURL("/oauth/authorize")
		gitlab.TokenURL = gitlabEndpointURL("/oauth/token")
		gitlab.ProfileURL = gitlabEndpointURL("/api/v4/user")
	}
	goth.UseProviders(
		gitlab.New(
			SecretsConfig.IdP.GitLab.Key,
			SecretsConfig.IdP.GitLab.Secret,
			URLForAPI("oauth/gitlab/callback", nil),
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
			URLForAPI("oauth/google/callback", nil),
			"email",
			"profile"),
	)
}

// linkedinOauthConfigure configures federated authentication via LinkedIn
func linkedinOauthConfigure() {
	if !SecretsConfig.IdP.LinkedIn.Usable() {
		logger.Debug("LinkedIn auth isn't configured or enabled")
		return
	}

	logger.Infof("Registering LinkedIn OAuth2 provider for client %s", SecretsConfig.IdP.LinkedIn.Key)
	goth.UseProviders(
		linkedin.New(
			SecretsConfig.IdP.LinkedIn.Key,
			SecretsConfig.IdP.LinkedIn.Secret,
			URLForAPI("oauth/linkedin/callback", nil)),
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
			URLForAPI("oauth/twitter/callback", nil)),
	)
}
