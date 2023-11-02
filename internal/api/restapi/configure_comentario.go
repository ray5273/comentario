package restapi

import (
	"crypto/tls"
	"github.com/go-openapi/errors"
	"github.com/go-openapi/runtime"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"github.com/justinas/alice"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/api/restapi/handlers"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_embed"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"net/http"
)

// logger represents a package-wide logger instance
var logger = logging.MustGetLogger("restapi")

func configureFlags(api *operations.ComentarioAPI) {
	api.CommandLineOptionsGroups = []swag.CommandLineOptionsGroup{
		{
			ShortDescription: "Server options",
			LongDescription:  "Server options",
			Options:          &config.CLIFlags,
		},
	}
}

func configureAPI(api *operations.ComentarioAPI) http.Handler {
	api.ServeError = errors.ServeError
	api.Logger = logger.Infof
	api.JSONConsumer = runtime.JSONConsumer()
	api.JSONProducer = runtime.JSONProducer()
	api.GzipProducer = runtime.ByteStreamProducer()
	api.HTMLProducer = runtime.TextProducer()

	// Use a more strict email validator than the default, RFC5322-compliant one
	eml := strfmt.Email("")
	api.Formats().Add("email", &eml, util.IsValidEmail)

	// Validate URI as an absolute URL (HTTP is allowed in general)
	uri := strfmt.URI("")
	api.Formats().Add("uri", &uri, func(s string) bool { return util.IsValidURL(s, true) })

	// Update the config based on the CLI flags
	if err := config.CLIParsed(); err != nil {
		logger.Fatalf("Failed to process configuration: %v", err)
	}

	// Configure swagger UI
	if config.CLIFlags.EnableSwaggerUI {
		logger.Warningf("Enabling Swagger UI")
		api.UseSwaggerUI()
	}

	// Set up auth handlers
	api.TokenAuth = handlers.AuthBearerToken
	api.UserSessionHeaderAuth = handlers.AuthUserBySessionHeader
	api.UserCookieAuth = handlers.AuthUserByCookieHeader

	//------------------------------------------------------------------------------------------------------------------
	// General API
	//------------------------------------------------------------------------------------------------------------------

	// Auth
	api.APIGeneralAuthConfirmHandler = api_general.AuthConfirmHandlerFunc(handlers.AuthConfirm)
	api.APIGeneralAuthDeleteProfileHandler = api_general.AuthDeleteProfileHandlerFunc(handlers.AuthDeleteProfile)
	api.APIGeneralAuthLoginHandler = api_general.AuthLoginHandlerFunc(handlers.AuthLogin)
	api.APIGeneralAuthLoginTokenNewHandler = api_general.AuthLoginTokenNewHandlerFunc(handlers.AuthLoginTokenNew)
	api.APIGeneralAuthLoginTokenRedeemHandler = api_general.AuthLoginTokenRedeemHandlerFunc(handlers.AuthLoginTokenRedeem)
	api.APIGeneralAuthLogoutHandler = api_general.AuthLogoutHandlerFunc(handlers.AuthLogout)
	api.APIGeneralAuthPwdResetChangeHandler = api_general.AuthPwdResetChangeHandlerFunc(handlers.AuthPwdResetChange)
	api.APIGeneralAuthPwdResetSendEmailHandler = api_general.AuthPwdResetSendEmailHandlerFunc(handlers.AuthPwdResetSendEmail)
	api.APIGeneralAuthSignupHandler = api_general.AuthSignupHandlerFunc(handlers.AuthSignup)
	// OAuth
	api.APIGeneralAuthOauthCallbackHandler = api_general.AuthOauthCallbackHandlerFunc(handlers.AuthOauthCallback)
	api.APIGeneralAuthOauthInitHandler = api_general.AuthOauthInitHandlerFunc(handlers.AuthOauthInit)
	// Config
	api.APIGeneralConfigDynamicResetHandler = api_general.ConfigDynamicResetHandlerFunc(handlers.ConfigDynamicReset)
	api.APIGeneralConfigDynamicUpdateHandler = api_general.ConfigDynamicUpdateHandlerFunc(handlers.ConfigDynamicUpdate)
	api.APIGeneralConfigExtensionsGetHandler = api_general.ConfigExtensionsGetHandlerFunc(handlers.ConfigExtensionsGet)
	api.APIGeneralConfigGetHandler = api_general.ConfigGetHandlerFunc(handlers.ConfigGet)
	// Mail
	api.APIGeneralMailUnsubscribeHandler = api_general.MailUnsubscribeHandlerFunc(handlers.MailUnsubscribe)
	// CurUser
	api.APIGeneralCurUserGetHandler = api_general.CurUserGetHandlerFunc(handlers.CurUserGet)
	api.APIGeneralCurUserSetAvatarHandler = api_general.CurUserSetAvatarHandlerFunc(handlers.CurUserSetAvatar)
	api.APIGeneralCurUserUpdateHandler = api_general.CurUserUpdateHandlerFunc(handlers.CurUserUpdate)
	// Dashboard
	api.APIGeneralDashboardTotalsHandler = api_general.DashboardTotalsHandlerFunc(handlers.DashboardTotals)
	api.APIGeneralDashboardDailyStatsCommentsHandler = api_general.DashboardDailyStatsCommentsHandlerFunc(handlers.DashboardDailyStatsComments)
	api.APIGeneralDashboardDailyStatsPagesHandler = api_general.DashboardDailyStatsPagesHandlerFunc(handlers.DashboardDailyStatsPages)
	api.APIGeneralDashboardDailyStatsViewsHandler = api_general.DashboardDailyStatsViewsHandlerFunc(handlers.DashboardDailyStatsViews)
	// Domains
	api.APIGeneralDomainClearHandler = api_general.DomainClearHandlerFunc(handlers.DomainClear)
	api.APIGeneralDomainCountHandler = api_general.DomainCountHandlerFunc(handlers.DomainCount)
	api.APIGeneralDomainDeleteHandler = api_general.DomainDeleteHandlerFunc(handlers.DomainDelete)
	api.APIGeneralDomainExportHandler = api_general.DomainExportHandlerFunc(handlers.DomainExport)
	api.APIGeneralDomainGetHandler = api_general.DomainGetHandlerFunc(handlers.DomainGet)
	api.APIGeneralDomainImportHandler = api_general.DomainImportHandlerFunc(handlers.DomainImport)
	api.APIGeneralDomainListHandler = api_general.DomainListHandlerFunc(handlers.DomainList)
	api.APIGeneralDomainNewHandler = api_general.DomainNewHandlerFunc(handlers.DomainNew)
	api.APIGeneralDomainSsoSecretNewHandler = api_general.DomainSsoSecretNewHandlerFunc(handlers.DomainSsoSecretNew)
	api.APIGeneralDomainReadonlyHandler = api_general.DomainReadonlyHandlerFunc(handlers.DomainReadonly)
	api.APIGeneralDomainUpdateHandler = api_general.DomainUpdateHandlerFunc(handlers.DomainUpdate)
	// Domain pages
	api.APIGeneralDomainPageGetHandler = api_general.DomainPageGetHandlerFunc(handlers.DomainPageGet)
	api.APIGeneralDomainPageListHandler = api_general.DomainPageListHandlerFunc(handlers.DomainPageList)
	api.APIGeneralDomainPageUpdateHandler = api_general.DomainPageUpdateHandlerFunc(handlers.DomainPageUpdate)
	api.APIGeneralDomainPageUpdateTitleHandler = api_general.DomainPageUpdateTitleHandlerFunc(handlers.DomainPageUpdateTitle)
	// Comments
	api.APIGeneralCommentCountHandler = api_general.CommentCountHandlerFunc(handlers.CommentCount)
	api.APIGeneralCommentDeleteHandler = api_general.CommentDeleteHandlerFunc(handlers.CommentDelete)
	api.APIGeneralCommentGetHandler = api_general.CommentGetHandlerFunc(handlers.CommentGet)
	api.APIGeneralCommentListHandler = api_general.CommentListHandlerFunc(handlers.CommentList)
	api.APIGeneralCommentModerateHandler = api_general.CommentModerateHandlerFunc(handlers.CommentModerate)
	// Domain users
	api.APIGeneralDomainUserListHandler = api_general.DomainUserListHandlerFunc(handlers.DomainUserList)
	api.APIGeneralDomainUserGetHandler = api_general.DomainUserGetHandlerFunc(handlers.DomainUserGet)
	api.APIGeneralDomainUserUpdateHandler = api_general.DomainUserUpdateHandlerFunc(handlers.DomainUserUpdate)
	// Users
	api.APIGeneralUserAvatarGetHandler = api_general.UserAvatarGetHandlerFunc(handlers.UserAvatarGet)
	api.APIGeneralUserBanHandler = api_general.UserBanHandlerFunc(handlers.UserBan)
	api.APIGeneralUserDeleteHandler = api_general.UserDeleteHandlerFunc(handlers.UserDelete)
	api.APIGeneralUserGetHandler = api_general.UserGetHandlerFunc(handlers.UserGet)
	api.APIGeneralUserListHandler = api_general.UserListHandlerFunc(handlers.UserList)
	api.APIGeneralUserUpdateHandler = api_general.UserUpdateHandlerFunc(handlers.UserUpdate)

	//------------------------------------------------------------------------------------------------------------------
	// Embed API
	//------------------------------------------------------------------------------------------------------------------

	// Auth
	api.APIEmbedEmbedAuthLoginHandler = api_embed.EmbedAuthLoginHandlerFunc(handlers.EmbedAuthLogin)
	api.APIEmbedEmbedAuthLoginTokenRedeemHandler = api_embed.EmbedAuthLoginTokenRedeemHandlerFunc(handlers.EmbedAuthLoginTokenRedeem)
	api.APIEmbedEmbedAuthLogoutHandler = api_embed.EmbedAuthLogoutHandlerFunc(handlers.EmbedAuthLogout)
	api.APIEmbedEmbedAuthSignupHandler = api_embed.EmbedAuthSignupHandlerFunc(handlers.EmbedAuthSignup)
	api.APIEmbedEmbedAuthCurUserGetHandler = api_embed.EmbedAuthCurUserGetHandlerFunc(handlers.EmbedAuthCurUserGet)
	api.APIEmbedEmbedAuthCurUserUpdateHandler = api_embed.EmbedAuthCurUserUpdateHandlerFunc(handlers.EmbedAuthCurUserUpdate)
	// Comment
	api.APIEmbedEmbedCommentCountHandler = api_embed.EmbedCommentCountHandlerFunc(handlers.EmbedCommentCount)
	api.APIEmbedEmbedCommentDeleteHandler = api_embed.EmbedCommentDeleteHandlerFunc(handlers.EmbedCommentDelete)
	api.APIEmbedEmbedCommentListHandler = api_embed.EmbedCommentListHandlerFunc(handlers.EmbedCommentList)
	api.APIEmbedEmbedCommentModerateHandler = api_embed.EmbedCommentModerateHandlerFunc(handlers.EmbedCommentModerate)
	api.APIEmbedEmbedCommentNewHandler = api_embed.EmbedCommentNewHandlerFunc(handlers.EmbedCommentNew)
	api.APIEmbedEmbedCommentStickyHandler = api_embed.EmbedCommentStickyHandlerFunc(handlers.EmbedCommentSticky)
	api.APIEmbedEmbedCommentUpdateHandler = api_embed.EmbedCommentUpdateHandlerFunc(handlers.EmbedCommentUpdate)
	api.APIEmbedEmbedCommentVoteHandler = api_embed.EmbedCommentVoteHandlerFunc(handlers.EmbedCommentVote)
	// Page
	api.APIEmbedEmbedPageUpdateHandler = api_embed.EmbedPageUpdateHandlerFunc(handlers.EmbedPageUpdate)

	// Shutdown functions
	api.PreServerShutdown = func() {}
	api.ServerShutdown = svc.TheServiceManager.Shutdown

	// If in e2e-testing mode, configure the backend accordingly
	if config.CLIFlags.E2e {
		if err := handlers.E2eConfigure(api); err != nil {
			logger.Fatalf("Failed to configure e2e plugin: %v", err)
		}
	}

	// Set up the middleware
	chain := alice.New(
		redirectToLangRootHandler,
		corsHandler,
		staticHandler,
		makeAPIHandler(api.Serve(nil)),
	)

	// Finally add the fallback handlers
	return chain.Then(fallbackHandler())
}

// The TLS configuration before HTTPS server starts.
func configureTLS(_ *tls.Config) {
	// Not implemented
}

// configureServer is a callback that is invoked before the server startup with the protocol it's supposed to be
// handling (http, https, or unix)
func configureServer(_ *http.Server, scheme, _ string) {
	if scheme != "http" {
		return
	}

	// Initialise the service manager
	svc.TheServiceManager.Initialise()

	// Init the e2e handler, if in the e2e testing mode
	if config.CLIFlags.E2e {
		if err := handlers.E2eInit(); err != nil {
			logger.Fatalf("e2e handler init failed: %v", err)
		}
	}

	// Start background services
	svc.TheServiceManager.Run()
}
