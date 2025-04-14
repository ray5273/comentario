package handlers

import (
	"crypto/hmac"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"github.com/go-openapi/runtime/middleware"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_e2e"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/intf"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"io"
	"os"
	"path"
	"plugin"
)

// Global e2e handler instance (only in e2e testing mode)
var e2eHandler intf.End2EndHandler

// e2eApp is an End2EndApp implementation, which links this app to the e2e plugin
type e2eApp struct {
	logger *logging.Logger
}

func (a *e2eApp) SetMailer(mailer intf.Mailer) {
	util.TheMailer = mailer
}

func (a *e2eApp) SetVersionService(s intf.VersionService) {
	svc.Services.SetVersionService(s)
}

func (a *e2eApp) LogError(fmt string, args ...any) {
	a.logger.Errorf(fmt, args...)
}

func (a *e2eApp) LogInfo(fmt string, args ...any) {
	a.logger.Infof(fmt, args...)
}

func (a *e2eApp) LogWarning(fmt string, args ...any) {
	a.logger.Warningf(fmt, args...)
}

func (a *e2eApp) RecreateDBSchema(seedSQL string) error {
	return svc.Services.E2eRecreateDBSchema(seedSQL)
}

func (a *e2eApp) XSRFSafePaths() intf.PathRegistry {
	return util.XSRFSafePaths
}

// E2eConfigure configures the app to run in the end-2-end testing mode
func E2eConfigure(api *operations.ComentarioAPI) error {
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
	hPtr, ok := h.(*intf.End2EndHandler)
	if !ok {
		return fmt.Errorf("symbol Handler from plugin %s doesn't implement End2EndHandler", pluginFile)
	}

	// Configure API endpoints
	e2eHandler = *hPtr
	api.APIE2eE2eConfigDynamicUpdateHandler = api_e2e.E2eConfigDynamicUpdateHandlerFunc(E2eConfigDynamicUpdate)
	api.APIE2eE2eConfigVersionLatestReleaseUpdateHandler = api_e2e.E2eConfigVersionLatestReleaseUpdateHandlerFunc(E2eConfigVersionLatestReleaseUpdate)
	api.APIE2eE2eDomainPatchHandler = api_e2e.E2eDomainPatchHandlerFunc(E2eDomainPatch)
	api.APIE2eE2eDomainConfigUpdateHandler = api_e2e.E2eDomainConfigUpdateHandlerFunc(E2eDomainConfigUpdate)
	api.APIE2eE2eDomainUpdateAttrsHandler = api_e2e.E2eDomainUpdateAttrsHandlerFunc(E2eDomainUpdateAttrs)
	api.APIE2eE2eDomainUpdateIdpsHandler = api_e2e.E2eDomainUpdateIdpsHandlerFunc(E2eDomainUpdateIdps)
	api.APIE2eE2eMailsGetHandler = api_e2e.E2eMailsGetHandlerFunc(E2eMailsGet)
	api.APIE2eE2eOAuthFederatedLoginHandler = api_e2e.E2eOAuthFederatedLoginHandlerFunc(E2eOAuthFederatedLogin)
	api.APIE2eE2eOAuthSSONonInteractiveHandler = api_e2e.E2eOAuthSSONonInteractiveHandlerFunc(E2eOAuthSSONonInteractive)
	api.APIE2eE2eResetHandler = api_e2e.E2eResetHandlerFunc(E2eReset)
	api.APIE2eE2eUserUpdateAttrsHandler = api_e2e.E2eUserUpdateAttrsHandlerFunc(E2eUserUpdateAttrs)

	// Reduce delays during end-2-end tests
	util.WrongAuthDelayMin = 0
	util.WrongAuthDelayMax = 0

	// Succeeded
	return nil
}

// E2eInit initialises the e2e plugin
func E2eInit() error {
	return e2eHandler.Init(&e2eApp{logger: logging.MustGetLogger("e2e")})
}

func E2eConfigDynamicUpdate(params api_e2e.E2eConfigDynamicUpdateParams) middleware.Responder {
	// Update the config
	if err := svc.Services.DynConfigService().Update(nil, data.DynConfigDTOsToMap(params.Body)); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_e2e.NewE2eConfigDynamicUpdateNoContent()
}

func E2eConfigVersionLatestReleaseUpdate(params api_e2e.E2eConfigVersionLatestReleaseUpdateParams) middleware.Responder {
	// Update the mocked version
	e2eHandler.SetLatestRelease(params.Body.Name, params.Body.Version, params.Body.PageURL)

	// Succeeded
	return api_e2e.NewE2eConfigVersionLatestReleaseUpdateNoContent()
}

func E2eDomainPatch(params api_e2e.E2eDomainPatchParams) middleware.Responder {
	// Load the domain
	domain, r := domainGet(params.UUID)
	if r != nil {
		return r
	}

	// Convert the domain into a DTO model
	dto := domain.ToDTO()

	// Patch the DTO using the provided JSON
	if params.HTTPRequest.Body == nil {
		return respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails("body is required"))
	}
	//goland:noinspection GoUnhandledErrorResult
	defer params.HTTPRequest.Body.Close()
	if body, err := io.ReadAll(params.HTTPRequest.Body); err != nil {
		return respInternalError(exmodels.ErrorInvalidInputData.WithDetails(err.Error()))
	} else {
		if err := json.Unmarshal(body, &dto); err != nil {
			return respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails(err.Error()))
		}
	}

	// Save the changes back into the DB
	domain.FromDTO(dto)
	if err := svc.Services.DomainService(nil).Update(domain); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_e2e.NewE2eDomainPatchNoContent()
}

func E2eDomainConfigUpdate(params api_e2e.E2eDomainConfigUpdateParams) middleware.Responder {
	// Parse domain ID
	domainID, r := parseUUID(params.UUID)
	if r != nil {
		return r
	}

	// Update the domain setting
	if err := svc.Services.DomainConfigService(nil).Update(domainID, nil, data.DynConfigDTOsToMap(params.Body)); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_e2e.NewE2eDomainConfigUpdateNoContent()
}

func E2eDomainUpdateAttrs(params api_e2e.E2eDomainUpdateAttrsParams) middleware.Responder {
	// Parse domain ID
	domainID, r := parseUUID(params.UUID)
	if r != nil {
		return r
	}

	// Update the attributes
	if err := svc.Services.DomainAttrService(nil).Set(domainID, *params.Body.Values); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_e2e.NewE2eDomainUpdateAttrsNoContent()
}

func E2eDomainUpdateIdps(params api_e2e.E2eDomainUpdateIdpsParams) middleware.Responder {
	// Parse domain ID
	domainID, r := parseUUID(params.UUID)
	if r != nil {
		return r
	}

	// Update the list of IdPs
	if err := svc.Services.DomainService(nil).SaveIdPs(domainID, params.Body); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_e2e.NewE2eDomainUpdateIdpsNoContent()
}

func E2eMailsGet(api_e2e.E2eMailsGetParams) middleware.Responder {
	// Convert the emails into an API model
	mails := e2eHandler.Mails()
	items := make([]*api_e2e.E2eMailsGetOKBodyItems0, len(mails))
	for i, m := range mails {
		items[i] = &api_e2e.E2eMailsGetOKBodyItems0{
			Body:       m.Body,
			EmbedFiles: m.EmbedFiles,
			Headers:    m.Headers,
			Succeeded:  m.Succeeded,
		}
	}
	return api_e2e.NewE2eMailsGetOK().WithPayload(items)
}

func E2eOAuthFederatedLogin(params api_e2e.E2eOAuthFederatedLoginParams) middleware.Responder {
	// Fetch the user
	u, r := userGet(params.UUID)
	if r != nil {
		return r
	}

	// Check it's a federated user
	if u.FederatedSSO {
		return respUnauthorized(exmodels.ErrorNotAllowed.WithDetails("is an SSO user"))
	}
	if !u.FederatedIdP.Valid || u.FederatedIdP.String == "" {
		return respUnauthorized(exmodels.ErrorNotAllowed.WithDetails("not a federated user"))
	}

	// Check the provider
	if _, r := Verifier.FederatedIdProvider(models.FederatedIdpID(u.FederatedIdP.String)); r != nil {
		return r
	}

	// Verify the user can log in and create a new session
	us, r := loginUser(u, "", params.HTTPRequest)
	if r != nil {
		return r
	}

	// Succeeded. Return a principal and a session cookie
	return authAddUserSessionToResponse(api_e2e.NewE2eOAuthFederatedLoginOK(), u, us)
}

func E2eOAuthSSONonInteractive(params api_e2e.E2eOAuthSSONonInteractiveParams) middleware.Responder {
	// Load the domain
	domain, r := domainGet(params.UUID)
	if r != nil {
		return r
	}

	// Verify domain SSO config
	if r := Verifier.DomainSSOConfig(domain); r != nil {
		return r
	}

	// Parse the token
	token, err := hex.DecodeString(params.Token)
	if err != nil {
		return respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails("token"))
	}

	// Parse the HMAC
	tokenHMAC, err := hex.DecodeString(params.Hmac)
	if err != nil {
		return respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails("hmac"))
	}

	secBytes, err := domain.SSOSecretBytes()
	if err != nil {
		logger.Errorf("Failed to decode domain (ID=%s) SSO secret: %v", &domain.ID, err)
		return respInternalError(nil)
	} else if secBytes == nil {
		logger.Errorf("Domain (ID=%d) SSO secret not set", &domain.ID)
		return respInternalError(nil)
	}

	// Verify the token signature
	if !hmac.Equal(tokenHMAC, util.HMACSign(token, secBytes)) {
		return respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails("HMAC signature doesn't check out"))
	}

	// Make a fake payload
	payload := &ssoPayload{
		Token: hex.EncodeToString(token),
		Email: "john.doe.sso@comentario.app",
		Name:  "John Doe",
		Role:  string(models.DomainUserRoleModerator),
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return respInternalError(nil)
	}

	// Calculate the callback URL, including the payload and its HMAC signature
	u := config.ServerConfig.ParsedBaseURL().JoinPath(util.APIPath, "oauth/sso/callback")
	q := u.Query()
	q.Set("payload", hex.EncodeToString(payloadBytes))
	q.Set("hmac", hex.EncodeToString(util.HMACSign(payloadBytes, secBytes)))
	u.RawQuery = q.Encode()

	// Succeeded
	return api_e2e.NewE2eOAuthSSONonInteractiveFound().WithLocation(u.String())
}

func E2eReset(api_e2e.E2eResetParams) middleware.Responder {
	if err := e2eHandler.HandleReset(); err != nil {
		logger.Errorf("E2eReset failed: %v", err)
		return api_general.NewGenericInternalServerError()
	}
	return api_e2e.NewE2eResetNoContent()
}

func E2eUserUpdateAttrs(params api_e2e.E2eUserUpdateAttrsParams) middleware.Responder {
	// Parse domain ID
	userID, r := parseUUID(params.UUID)
	if r != nil {
		return r
	}

	// Update the attributes
	if err := svc.Services.UserAttrService(nil).Set(userID, *params.Body.Values); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_e2e.NewE2eUserUpdateAttrsNoContent()
}
