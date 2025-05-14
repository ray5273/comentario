package restapi

import (
	"crypto/tls"
	"encoding/xml"
	"fmt"
	"github.com/go-openapi/errors"
	"github.com/go-openapi/runtime"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"github.com/gorilla/feeds"
	"github.com/justinas/alice"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/api/restapi/handlers"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_embed"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_rss"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"io"
	"net/http"
	"strings"
)

// logger represents a package-wide logger instance
var logger = logging.MustGetLogger("restapi")

func configureFlags(api *operations.ComentarioAPI) {
	api.CommandLineOptionsGroups = []swag.CommandLineOptionsGroup{
		{
			ShortDescription: "Server options",
			LongDescription:  "Server options",
			Options:          &config.ServerConfig,
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
	api.XMLProducer = XMLAndRSSProducer()

	// Use a more strict email validator than the default, RFC5322-compliant one
	var eml strfmt.Email
	api.Formats().Add("email", &eml, util.IsValidEmail)

	// Format "password" means a strong password
	var pwd strfmt.Password
	api.Formats().Add("password", &pwd, util.IsStrongPassword)

	// Validate URI as an absolute URL (HTTP is allowed in general)
	var uri strfmt.URI
	api.Formats().Add("uri", &uri, func(s string) bool { return util.IsValidURL(s, true) })

	// Configure swagger UI
	if config.ServerConfig.EnableSwaggerUI {
		logger.Warningf("Enabling Swagger UI")
		api.UseSwaggerUI()
	}

	// Set up auth handlers
	authSvc := svc.Services.AuthService(nil)
	api.TokenAuth = authSvc.AuthenticateBearerToken
	api.UserSessionHeaderAuth = authSvc.AuthenticateUserBySessionHeader
	api.UserCookieAuth = authSvc.AuthenticateUserByCookieHeader

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
	api.APIGeneralConfigVersionsGetHandler = api_general.ConfigVersionsGetHandlerFunc(handlers.ConfigVersionsGet)
	// Mail
	api.APIGeneralMailUnsubscribeHandler = api_general.MailUnsubscribeHandlerFunc(handlers.MailUnsubscribe)
	// CurUser
	api.APIGeneralCurUserEmailUpdateConfirmHandler = api_general.CurUserEmailUpdateConfirmHandlerFunc(handlers.CurUserEmailUpdateConfirm)
	api.APIGeneralCurUserEmailUpdateRequestHandler = api_general.CurUserEmailUpdateRequestHandlerFunc(handlers.CurUserEmailUpdateRequest)
	api.APIGeneralCurUserGetHandler = api_general.CurUserGetHandlerFunc(handlers.CurUserGet)
	api.APIGeneralCurUserSetAvatarFromGravatarHandler = api_general.CurUserSetAvatarFromGravatarHandlerFunc(handlers.CurUserSetAvatarFromGravatar)
	api.APIGeneralCurUserSetAvatarHandler = api_general.CurUserSetAvatarHandlerFunc(handlers.CurUserSetAvatar)
	api.APIGeneralCurUserUpdateHandler = api_general.CurUserUpdateHandlerFunc(handlers.CurUserUpdate)
	// Dashboard
	api.APIGeneralDashboardDailyStatsHandler = api_general.DashboardDailyStatsHandlerFunc(handlers.DashboardDailyStats)
	api.APIGeneralDashboardPageStatsHandler = api_general.DashboardPageStatsHandlerFunc(handlers.DashboardPageStats)
	api.APIGeneralDashboardPageViewStatsHandler = api_general.DashboardPageViewStatsHandlerFunc(handlers.DashboardPageViewStats)
	api.APIGeneralDashboardTotalsHandler = api_general.DashboardTotalsHandlerFunc(handlers.DashboardTotals)
	// Domains
	api.APIGeneralDomainClearHandler = api_general.DomainClearHandlerFunc(handlers.DomainClear)
	api.APIGeneralDomainCountHandler = api_general.DomainCountHandlerFunc(handlers.DomainCount)
	api.APIGeneralDomainDeleteHandler = api_general.DomainDeleteHandlerFunc(handlers.DomainDelete)
	api.APIGeneralDomainExportHandler = api_general.DomainExportHandlerFunc(handlers.DomainExport)
	api.APIGeneralDomainGetHandler = api_general.DomainGetHandlerFunc(handlers.DomainGet)
	api.APIGeneralDomainImportHandler = api_general.DomainImportHandlerFunc(handlers.DomainImport)
	api.APIGeneralDomainListHandler = api_general.DomainListHandlerFunc(handlers.DomainList)
	api.APIGeneralDomainNewHandler = api_general.DomainNewHandlerFunc(handlers.DomainNew)
	api.APIGeneralDomainPurgeHandler = api_general.DomainPurgeHandlerFunc(handlers.DomainPurge)
	api.APIGeneralDomainSsoSecretNewHandler = api_general.DomainSsoSecretNewHandlerFunc(handlers.DomainSsoSecretNew)
	api.APIGeneralDomainReadonlyHandler = api_general.DomainReadonlyHandlerFunc(handlers.DomainReadonly)
	api.APIGeneralDomainUpdateHandler = api_general.DomainUpdateHandlerFunc(handlers.DomainUpdate)
	// Domain pages
	api.APIGeneralDomainPageDeleteHandler = api_general.DomainPageDeleteHandlerFunc(handlers.DomainPageDelete)
	api.APIGeneralDomainPageGetHandler = api_general.DomainPageGetHandlerFunc(handlers.DomainPageGet)
	api.APIGeneralDomainPageListHandler = api_general.DomainPageListHandlerFunc(handlers.DomainPageList)
	api.APIGeneralDomainPageMoveDataHandler = api_general.DomainPageMoveDataHandlerFunc(handlers.DomainPageMoveData)
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
	api.APIGeneralUserSessionListHandler = api_general.UserSessionListHandlerFunc(handlers.UserSessionList)
	api.APIGeneralUserSessionsExpireHandler = api_general.UserSessionsExpireHandlerFunc(handlers.UserSessionsExpire)
	api.APIGeneralUserUnlockHandler = api_general.UserUnlockHandlerFunc(handlers.UserUnlock)
	api.APIGeneralUserUpdateHandler = api_general.UserUpdateHandlerFunc(handlers.UserUpdate)

	//------------------------------------------------------------------------------------------------------------------
	// Embed API
	//------------------------------------------------------------------------------------------------------------------

	// I18n
	api.APIEmbedEmbedI18nMessagesHandler = api_embed.EmbedI18nMessagesHandlerFunc(handlers.EmbedI18nMessages)
	// Auth
	api.APIEmbedEmbedAuthLoginHandler = api_embed.EmbedAuthLoginHandlerFunc(handlers.EmbedAuthLogin)
	api.APIEmbedEmbedAuthLoginTokenNewHandler = api_embed.EmbedAuthLoginTokenNewHandlerFunc(handlers.EmbedAuthLoginTokenNew)
	api.APIEmbedEmbedAuthLoginTokenRedeemHandler = api_embed.EmbedAuthLoginTokenRedeemHandlerFunc(handlers.EmbedAuthLoginTokenRedeem)
	api.APIEmbedEmbedAuthLogoutHandler = api_embed.EmbedAuthLogoutHandlerFunc(handlers.EmbedAuthLogout)
	api.APIEmbedEmbedAuthSignupHandler = api_embed.EmbedAuthSignupHandlerFunc(handlers.EmbedAuthSignup)
	api.APIEmbedEmbedAuthCurUserGetHandler = api_embed.EmbedAuthCurUserGetHandlerFunc(handlers.EmbedAuthCurUserGet)
	api.APIEmbedEmbedAuthCurUserUpdateHandler = api_embed.EmbedAuthCurUserUpdateHandlerFunc(handlers.EmbedAuthCurUserUpdate)
	// Comment
	api.APIEmbedEmbedCommentCountHandler = api_embed.EmbedCommentCountHandlerFunc(handlers.EmbedCommentCount)
	api.APIEmbedEmbedCommentDeleteHandler = api_embed.EmbedCommentDeleteHandlerFunc(handlers.EmbedCommentDelete)
	api.APIEmbedEmbedCommentGetHandler = api_embed.EmbedCommentGetHandlerFunc(handlers.EmbedCommentGet)
	api.APIEmbedEmbedCommentListHandler = api_embed.EmbedCommentListHandlerFunc(handlers.EmbedCommentList)
	api.APIEmbedEmbedCommentModerateHandler = api_embed.EmbedCommentModerateHandlerFunc(handlers.EmbedCommentModerate)
	api.APIEmbedEmbedCommentNewHandler = api_embed.EmbedCommentNewHandlerFunc(handlers.EmbedCommentNew)
	api.APIEmbedEmbedCommentPreviewHandler = api_embed.EmbedCommentPreviewHandlerFunc(handlers.EmbedCommentPreview)
	api.APIEmbedEmbedCommentStickyHandler = api_embed.EmbedCommentStickyHandlerFunc(handlers.EmbedCommentSticky)
	api.APIEmbedEmbedCommentUpdateHandler = api_embed.EmbedCommentUpdateHandlerFunc(handlers.EmbedCommentUpdate)
	api.APIEmbedEmbedCommentVoteHandler = api_embed.EmbedCommentVoteHandlerFunc(handlers.EmbedCommentVote)
	// Page
	api.APIEmbedEmbedPageUpdateHandler = api_embed.EmbedPageUpdateHandlerFunc(handlers.EmbedPageUpdate)

	//------------------------------------------------------------------------------------------------------------------
	// RSS API
	//------------------------------------------------------------------------------------------------------------------

	api.APIRssRssCommentsHandler = api_rss.RssCommentsHandlerFunc(handlers.RssComments)

	// Shutdown functions
	api.PreServerShutdown = func() {}
	api.ServerShutdown = svc.Services.Shutdown

	// If in e2e-testing mode, configure the backend accordingly
	if config.ServerConfig.E2e {
		if err := handlers.E2eConfigure(api); err != nil {
			logger.Fatalf("Failed to configure e2e plugin: %v", err)
		}
	}

	// Set up the middleware
	chain := alice.New(
		webSocketsHandler,
		redirectToLangRootHandler,
		corsHandler,
	)

	// If XSRF protection isn't disabled, add an XSRF handler
	if config.ServerConfig.DisableXSRF {
		logger.Warning("XSRF protection is disabled")
	} else {
		chain = chain.Append(xsrfProtectHandler, xsrfCookieHandler)

		// Extend the XSRF-safe path registry with items provided by plugins: iterate each plugin's config
		for _, cfg := range svc.Services.PluginManager().PluginConfigs() {
			for _, s := range cfg.XSRFSafePaths {
				util.XSRFSafePaths.Add(fmt.Sprintf("%s%s/%s", util.APIPath, cfg.Path, strings.TrimPrefix(s, "/")))
			}
		}
	}

	// Add the security headers, the static handler (after the XSRF one, since with the UI also a corresponding cookie
	// must be delivered), and the API handler
	chain = chain.Append(
		securityHeadersHandler,
		svc.Services.PluginManager().ServeHandler, // Comes before "regular" statics/API handlers because it can serve both
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

	// Init the e2e handler, if in the e2e testing mode
	if config.ServerConfig.E2e {
		if err := handlers.E2eInit(); err != nil {
			logger.Fatalf("e2e handler init failed: %v", err)
		}
	}

	// Start background services
	svc.Services.Run()
}

// XMLAndRSSProducer returns a new XML producer, which detects RSS feed and handles it accordingly
func XMLAndRSSProducer() runtime.Producer {
	return runtime.ProducerFunc(func(writer io.Writer, data interface{}) error {
		// Detect if it's an RSS feed
		if feed, ok := data.(*feeds.Feed); ok {
			return feed.WriteRss(writer)
		}

		// Fall back to the standard XML encoder otherwise
		return xml.NewEncoder(writer).Encode(data)
	})
}
