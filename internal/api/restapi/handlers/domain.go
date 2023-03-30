package handlers

import (
	"bytes"
	"fmt"
	"github.com/go-openapi/runtime/middleware"
	"github.com/markbates/goth"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_owner"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"io"
)

func DomainClear(params api_owner.DomainClearParams, principal data.Principal) middleware.Responder {
	// Verify the user owns the domain
	host := models.Host(params.Host)
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), host); r != nil {
		return r
	}

	// Clear all domain's pages/comments/votes
	if err := svc.TheDomainService.Clear(host); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainClearNoContent()
}

// DomainDelete deletes an existing domain belonging to the current user
func DomainDelete(params api_owner.DomainDeleteParams, principal data.Principal) middleware.Responder {
	// Find the domain
	domain, err := svc.TheDomainService.FindByHost(models.Host(params.Host))
	if err != nil {
		return respServiceError(err)
	}

	// Verify the user owns the domain
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), domain.Host); r != nil {
		return r
	}

	// Delete the domain
	if err = svc.TheDomainService.Delete(domain.Host); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainDeleteNoContent()
}

func DomainExportBegin(params api_owner.DomainExportBeginParams, principal data.Principal) middleware.Responder {
	// Make sure SMTP is configured
	if !config.SMTPConfigured {
		return respBadRequest(util.ErrorSMTPNotConfigured)
	}

	// Verify the user owns the domain
	host := models.Host(params.Host)
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), host); r != nil {
		return r
	}

	// Initiate domain export in the background
	go domainExport(host, principal.GetUser().Email)

	// Succeeded
	return api_owner.NewDomainExportBeginNoContent()
}

func DomainExportDownload(params api_owner.DomainExportDownloadParams) middleware.Responder {
	// Fetch the data
	domain, binData, created, err := svc.TheImportExportService.GetExportedData(models.HexID(params.ID))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainExportDownloadOK().
		WithContentDisposition(fmt.Sprintf(`inline; filename="%s-%v.json.gz"`, domain, created.Unix())).
		WithPayload(io.NopCloser(bytes.NewReader(binData)))
}

// DomainGet returns properties of a domain belonging to the current user
func DomainGet(params api_owner.DomainGetParams, principal data.Principal) middleware.Responder {
	// Find the domain
	domain, err := svc.TheDomainService.FindByHost(models.Host(params.Host))
	if err != nil {
		return respServiceError(err)
	}

	// Verify the user owns the domain
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), domain.Host); r != nil {
		return r
	}

	// Succeeded
	return api_owner.NewDomainGetOK().WithPayload(domain)
}

func DomainImport(params api_owner.DomainImportParams, principal data.Principal) middleware.Responder {
	// Verify the user owns the domain
	host := models.Host(params.Host)
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), host); r != nil {
		return r
	}

	// Perform import
	srcURL := data.URIToString(params.Body.URL)
	var count int64
	var err error
	switch params.Source {
	case "commento":
		count, err = svc.TheImportExportService.ImportCommento(host, srcURL)
	case "disqus":
		count, err = svc.TheImportExportService.ImportDisqus(host, srcURL)
	default:
		err = util.ErrorInternal
	}

	// Check the result
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainImportOK().WithPayload(&api_owner.DomainImportOKBody{NumImported: count})
}

// DomainList returns a list of domain belonging to the user
func DomainList(_ api_owner.DomainListParams, principal data.Principal) middleware.Responder {
	// Fetch domains by the owner
	domains, err := svc.TheDomainService.ListByOwner(principal.GetUser().HexID)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainListOK().WithPayload(&api_owner.DomainListOKBody{Domains: domains})
}

func DomainModeratorDelete(params api_owner.DomainModeratorDeleteParams, principal data.Principal) middleware.Responder {
	// Verify the user owns the domain
	host := models.Host(params.Host)
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), host); r != nil {
		return r
	}

	// Delete the moderator from the database
	if err := svc.TheDomainService.DeleteModerator(host, data.EmailToString(params.Body.Email)); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainModeratorDeleteNoContent()
}

func DomainModeratorNew(params api_owner.DomainModeratorNewParams, principal data.Principal) middleware.Responder {
	// Verify the user owns the domain
	host := models.Host(params.Host)
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), host); r != nil {
		return r
	}

	// Register a new domain moderator
	if _, err := svc.TheDomainService.CreateModerator(host, data.EmailToString(params.Body.Email)); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainModeratorNewNoContent()
}

func DomainNew(params api_owner.DomainNewParams, principal data.Principal) middleware.Responder {
	// Properly validate the domain's host (the Swagger pattern only performs a superficial check)
	domain := params.Body.Domain
	if ok, _, _ := util.IsValidHostPort(string(domain.Host)); !ok {
		logger.Warningf("DomainNew(): '%s' is not a valid host[:port]", domain.Host)
		return respBadRequest(util.ErrorInvalidDomainHost)
	}

	// Validate identity providers
	if err := domainValidateIdPs(domain); err != nil {
		return respBadRequest(err)
	}

	// Persist a new domain record in the database
	owner := principal.(*data.UserOwner)
	if err := svc.TheDomainService.Create(owner.HexID, domain); err != nil {
		return respServiceError(err)
	}

	// Register the current owner as a domain moderator
	if _, err := svc.TheDomainService.CreateModerator(domain.Host, owner.Email); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainNewNoContent()
}

func DomainSsoSecretNew(params api_owner.DomainSsoSecretNewParams, principal data.Principal) middleware.Responder {
	// Verify the user owns the domain
	host := models.Host(params.Host)
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), host); r != nil {
		return r
	}

	// Generate a new SSO secret for the domain
	token, err := svc.TheDomainService.CreateSSOSecret(models.Host(params.Host))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainSsoSecretNewOK().WithPayload(&api_owner.DomainSsoSecretNewOKBody{SsoSecret: token})
}

func DomainStatistics(params api_owner.DomainStatisticsParams, principal data.Principal) middleware.Responder {
	// Verify the user owns the domain
	host := models.Host(params.Host)
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), host); r != nil {
		return r
	}

	// Collect view stats
	views, err := svc.TheDomainService.StatsForViews(host)
	if err != nil {
		return respServiceError(err)
	}

	// Collect comment stats
	comments, err := svc.TheDomainService.StatsForComments(host)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainStatisticsOK().WithPayload(&api_owner.DomainStatisticsOKBody{
		CommentsLast30Days: comments,
		ViewsLast30Days:    views,
	})
}

// DomainToggleFrozen toggles domain state between frozen and unfrozen
func DomainToggleFrozen(params api_owner.DomainToggleFrozenParams, principal data.Principal) middleware.Responder {
	// Verify the user owns the domain
	host := models.Host(params.Host)
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), host); r != nil {
		return r
	}

	// Toggle the frozen state of the domain
	if err := svc.TheDomainService.ToggleFrozen(host); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainToggleFrozenNoContent()
}

func DomainUpdate(params api_owner.DomainUpdateParams, principal data.Principal) middleware.Responder {
	// Verify the user owns the domain
	domain := params.Body.Domain
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), domain.Host); r != nil {
		return r
	}

	// Validate identity providers
	if err := domainValidateIdPs(domain); err != nil {
		return respBadRequest(err)
	}

	// Update the domain record
	if err := svc.TheDomainService.Update(domain); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainUpdateNoContent()
}

// domainExport performs a domain export, then notifies the user about the outcome using the given email
func domainExport(host models.Host, email string) {
	// Export the data
	if exportHex, err := svc.TheImportExportService.CreateExport(host); err != nil {
		// Notify the user in a case of failure, ignoring any error
		_ = svc.TheMailService.SendFromTemplate(
			"",
			email,
			"Comentario Data Export Errored",
			"domain-export-error.gohtml",
			map[string]any{"Domain": host, "Error": util.ErrorInternal.Error()})

	} else {
		// Succeeded. Notify the user by email, ignoring any error
		_ = svc.TheMailService.SendFromTemplate(
			"",
			email,
			"Comentario Data Export",
			"domain-export.gohtml",
			map[string]any{
				"Domain": host,
				"URL":    config.URLForAPI("domain/export/download", map[string]string{"exportHex": string(exportHex)}),
			})
	}
}

// domainValidateIdPs validates the passed list of domain's identity providers
func domainValidateIdPs(domain *models.Domain) error {
	// Validate identity providers
	for _, id := range domain.Idps {
		switch id {
		// Local auth is always possible
		case models.IdentityProviderIDEmpty:
			continue

		// If SSO is included, make sure the URL is provided
		case models.IdentityProviderIDSso:
			if domain.SsoURL == "" {
				return util.ErrorSSOURLMissing
			}

		// It must be a federated provider. Make sure it's valid and configured
		default:
			if fidp, ok := data.FederatedIdProviders[id]; ok {
				if _, err := goth.GetProvider(fidp.GothID); err != nil {
					return fmt.Errorf("cannot enable identity provider '%s' as it isn't configured", fidp.Name)
				}
			} else {
				return fmt.Errorf("invalid identity provider ID: '%s'", id)
			}
		}
	}
	return nil
}
