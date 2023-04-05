package handlers

import (
	"bytes"
	"fmt"
	"github.com/go-openapi/runtime/middleware"
	"github.com/markbates/goth"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_owner"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"io"
	"strings"
	"time"
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

func DomainExport(params api_owner.DomainExportParams, principal data.Principal) middleware.Responder {
	// Verify the user owns the domain
	host := models.Host(params.Host)
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), host); r != nil {
		return r
	}

	// Export the data
	b, err := svc.TheImportExportService.Export(host)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded. Send the data as a file
	return api_owner.NewDomainExportOK().
		WithContentDisposition(
			fmt.Sprintf(
				`inline; filename="%s-%s.json.gz"`,
				strings.ReplaceAll(string(host), ":", "-"),
				time.Now().UTC().Format("2006-01-02-15-04-05"))).
		WithPayload(io.NopCloser(bytes.NewReader(b)))
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
	defer params.Data.Close()

	// Verify the user owns the domain
	host := models.Host(params.Host)
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), host); r != nil {
		return r
	}

	// Perform import
	var count int64
	var err error
	switch params.Source {
	case "commento":
		count, err = svc.TheImportExportService.ImportCommento(host, params.Data)
	case "disqus":
		count, err = svc.TheImportExportService.ImportDisqus(host, params.Data)
	default:
		respBadRequest(ErrorInvalidPropertyValue.WithDetails("source"))
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
		return respBadRequest(ErrorInvalidPropertyValue.WithDetails(string(domain.Host)))
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

// domainValidateIdPs validates the passed list of domain's identity providers
func domainValidateIdPs(domain *models.Domain) *exmodels.Error {
	// Validate identity providers
	for _, id := range domain.Idps {
		switch id {
		// Local auth is always possible
		case models.IdentityProviderIDEmpty:
			continue

		// If SSO is included, make sure the URL is provided
		case models.IdentityProviderIDSso:
			if domain.SsoURL == "" {
				return ErrorSSOURLMissing
			}

		// It must be a federated provider. Make sure it's valid and configured
		default:
			if fidp, ok := data.FederatedIdProviders[id]; ok {
				if _, err := goth.GetProvider(fidp.GothID); err != nil {
					return ErrorIdPUnconfigured.WithDetails(fidp.Name)
				}
			} else {
				return ErrorIdPUnknown.WithDetails(string(id))
			}
		}
	}
	return nil
}
