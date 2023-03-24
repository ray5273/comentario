package restapi

import (
	"crypto/tls"
	"fmt"
	"github.com/go-openapi/errors"
	"github.com/go-openapi/runtime"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"github.com/justinas/alice"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/api/restapi/handlers"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_auth"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_commenter"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_e2e"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_generic"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_owner"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/e2e"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"net/http"
	"os"
	"path"
	"plugin"
)

// logger represents a package-wide logger instance
var logger = logging.MustGetLogger("restapi")

// Global e2e handler instance (only in e2e testing mode)
var e2eHandler e2e.End2EndHandler

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
	api.UrlformConsumer = runtime.DiscardConsumer

	// Use a more strict email validator than the default, RFC5322-compliant one
	eml := strfmt.Email("")
	api.Formats().Add("email", &eml, util.IsValidEmail)

	// Validate URI as an absolute URL
	uri := strfmt.URI("")
	api.Formats().Add("uri", &uri, util.IsValidURL)

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
	api.CommenterTokenHeaderAuth = handlers.AuthCommenterByTokenHeader
	api.UserCookieAuth = handlers.AuthUserByCookieHeader

	//------------------------------------------------------------------------------------------------------------------
	// Auth API
	//------------------------------------------------------------------------------------------------------------------

	api.APIAuthCurUserGetHandler = api_auth.CurUserGetHandlerFunc(handlers.CurUserGet)
	api.APIAuthCurUserPwdResetSendEmailHandler = api_auth.CurUserPwdResetSendEmailHandlerFunc(handlers.CurUserPwdResetSendEmail)
	api.APIAuthCurUserPwdResetChangeHandler = api_auth.CurUserPwdResetChangeHandlerFunc(handlers.CurUserPwdResetChange)
	api.APIAuthAuthLoginHandler = api_auth.AuthLoginHandlerFunc(handlers.AuthLogin)
	api.APIAuthAuthLogoutHandler = api_auth.AuthLogoutHandlerFunc(handlers.AuthLogout)

	//------------------------------------------------------------------------------------------------------------------
	// Commenter API
	//------------------------------------------------------------------------------------------------------------------

	// Comment
	api.APICommenterCommentApproveHandler = api_commenter.CommentApproveHandlerFunc(handlers.CommentApprove)
	api.APICommenterCommentCountHandler = api_commenter.CommentCountHandlerFunc(handlers.CommentCount)
	api.APICommenterCommentDeleteHandler = api_commenter.CommentDeleteHandlerFunc(handlers.CommentDelete)
	api.APICommenterCommentEditHandler = api_commenter.CommentEditHandlerFunc(handlers.CommentEdit)
	api.APICommenterCommentListHandler = api_commenter.CommentListHandlerFunc(handlers.CommentList)
	api.APICommenterCommentNewHandler = api_commenter.CommentNewHandlerFunc(handlers.CommentNew)
	api.APICommenterCommentVoteHandler = api_commenter.CommentVoteHandlerFunc(handlers.CommentVote)
	// Commenter
	api.APICommenterCommenterLoginHandler = api_commenter.CommenterLoginHandlerFunc(handlers.CommenterLogin)
	api.APICommenterCommenterLogoutHandler = api_commenter.CommenterLogoutHandlerFunc(handlers.CommenterLogout)
	api.APICommenterCommenterNewHandler = api_commenter.CommenterNewHandlerFunc(handlers.CommenterNew)
	api.APICommenterCommenterPhotoHandler = api_commenter.CommenterPhotoHandlerFunc(handlers.CommenterPhoto)
	api.APICommenterCommenterSelfHandler = api_commenter.CommenterSelfHandlerFunc(handlers.CommenterSelf)
	api.APICommenterCommenterTokenNewHandler = api_commenter.CommenterTokenNewHandlerFunc(handlers.CommenterTokenNew)
	api.APICommenterCommenterUpdateHandler = api_commenter.CommenterUpdateHandlerFunc(handlers.CommenterUpdate)
	// Email
	api.APICommenterEmailGetHandler = api_commenter.EmailGetHandlerFunc(handlers.EmailGet)
	api.APICommenterEmailModerateHandler = api_commenter.EmailModerateHandlerFunc(handlers.EmailModerate)
	api.APICommenterEmailUpdateHandler = api_commenter.EmailUpdateHandlerFunc(handlers.EmailUpdate)
	// OAuth
	api.APICommenterOauthInitHandler = api_commenter.OauthInitHandlerFunc(handlers.OauthInit)
	api.APICommenterOauthCallbackHandler = api_commenter.OauthCallbackHandlerFunc(handlers.OauthCallback)
	api.APICommenterOauthSsoCallbackHandler = api_commenter.OauthSsoCallbackHandlerFunc(handlers.OauthSsoCallback)
	api.APICommenterOauthSsoInitHandler = api_commenter.OauthSsoInitHandlerFunc(handlers.OauthSsoInit)
	// Page
	api.APICommenterPageUpdateHandler = api_commenter.PageUpdateHandlerFunc(handlers.PageUpdate)

	//------------------------------------------------------------------------------------------------------------------
	// Owner API
	//------------------------------------------------------------------------------------------------------------------

	// Config
	api.APIOwnerConfigClientGetHandler = api_owner.ConfigClientGetHandlerFunc(handlers.ConfigClientGet)

	// Domain
	api.APIOwnerDomainClearHandler = api_owner.DomainClearHandlerFunc(handlers.DomainClear)
	api.APIOwnerDomainDeleteHandler = api_owner.DomainDeleteHandlerFunc(handlers.DomainDelete)
	api.APIOwnerDomainExportBeginHandler = api_owner.DomainExportBeginHandlerFunc(handlers.DomainExportBegin)
	api.APIOwnerDomainExportDownloadHandler = api_owner.DomainExportDownloadHandlerFunc(handlers.DomainExportDownload)
	api.APIOwnerDomainImportCommentoHandler = api_owner.DomainImportCommentoHandlerFunc(handlers.DomainImportCommento)
	api.APIOwnerDomainImportDisqusHandler = api_owner.DomainImportDisqusHandlerFunc(handlers.DomainImportDisqus)
	api.APIOwnerDomainListHandler = api_owner.DomainListHandlerFunc(handlers.DomainList)
	api.APIOwnerDomainModeratorDeleteHandler = api_owner.DomainModeratorDeleteHandlerFunc(handlers.DomainModeratorDelete)
	api.APIOwnerDomainModeratorNewHandler = api_owner.DomainModeratorNewHandlerFunc(handlers.DomainModeratorNew)
	api.APIOwnerDomainNewHandler = api_owner.DomainNewHandlerFunc(handlers.DomainNew)
	api.APIOwnerDomainSsoSecretNewHandler = api_owner.DomainSsoSecretNewHandlerFunc(handlers.DomainSsoSecretNew)
	api.APIOwnerDomainStatisticsHandler = api_owner.DomainStatisticsHandlerFunc(handlers.DomainStatistics)
	api.APIOwnerDomainUpdateHandler = api_owner.DomainUpdateHandlerFunc(handlers.DomainUpdate)
	// Owner
	api.APIOwnerOwnerConfirmHexHandler = api_owner.OwnerConfirmHexHandlerFunc(handlers.OwnerConfirmHex)
	api.APIOwnerOwnerDeleteHandler = api_owner.OwnerDeleteHandlerFunc(handlers.OwnerDelete)
	api.APIOwnerOwnerNewHandler = api_owner.OwnerNewHandlerFunc(handlers.OwnerNew)

	// Shutdown functions
	api.PreServerShutdown = func() {}
	api.ServerShutdown = svc.TheServiceManager.Shutdown

	// If in e2e-testing mode, configure the backend accordingly
	if config.CLIFlags.E2e {
		if err := configureE2eMode(api); err != nil {
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

	// Initialise the services
	svc.TheServiceManager.Initialise()

	// Init the e2e handler, if in the e2e testing mode
	if e2eHandler != nil {
		if err := e2eHandler.Init(&e2eApp{logger: logging.MustGetLogger("e2e")}); err != nil {
			logger.Fatalf("e2e handler init failed: %v", err)
		}
	}
}

// configureE2eMode configures the app to run in the end-2-end testing mode
func configureE2eMode(api *operations.ComentarioAPI) error {
	// Get the plugin path
	p, err := os.Executable()
	if err != nil {
		return err
	}
	pluginFile := path.Join(path.Dir(p), "comentario-e2e.so")

	// Load the e2e plugin
	logger.Infof("Loading e2e plugin %s", pluginFile)
	plug, err := plugin.Open(pluginFile)
	if err != nil {
		return err
	}

	// Look up the handler
	h, err := plug.Lookup("Handler")
	if err != nil {
		return err
	}

	// Fetch the service interface (hPtr is a pointer, because Lookup always returns a pointer to symbol)
	hPtr, ok := h.(*e2e.End2EndHandler)
	if !ok {
		return fmt.Errorf("symbol Handler from plugin %s doesn't implement End2EndHandler", pluginFile)
	}

	// Configure API endpoints
	e2eHandler = *hPtr
	api.APIE2eE2eResetHandler = api_e2e.E2eResetHandlerFunc(func(api_e2e.E2eResetParams) middleware.Responder {
		if err := e2eHandler.HandleReset(); err != nil {
			logger.Errorf("E2eReset failed: %v", err)
			return api_generic.NewGenericInternalServerError()
		}
		return api_e2e.NewE2eResetNoContent()
	})

	// Reduce delays during end-2-end tests
	util.WrongAuthDelay = 0

	// Succeeded
	return nil
}
