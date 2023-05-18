package handlers

import (
	"bytes"
	"fmt"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_owner"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"io"
	"strings"
	"time"
)

func DomainClear(params api_owner.DomainClearParams, user *data.User) middleware.Responder {
	// Find the domain and verify the user's ownership
	if d, _, r := domainGetDomainAndOwner(params.UUID, user); r != nil {
		return r

		// Clear all domain's users/pages/comments
	} else if err := svc.TheDomainService.ClearByID(&d.ID); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainClearNoContent()
}

// DomainDelete deletes an existing domain belonging to the current user
func DomainDelete(params api_owner.DomainDeleteParams, user *data.User) middleware.Responder {
	// Find the domain and verify the user's ownership
	if d, _, r := domainGetDomainAndOwner(params.UUID, user); r != nil {
		return r

		// Delete the domain and all dependent objects
	} else if err := svc.TheDomainService.DeleteByID(&d.ID); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainDeleteNoContent()
}

func DomainExport(params api_owner.DomainExportParams, user *data.User) middleware.Responder {
	// Find the domain and verify the user's ownership
	if d, _, r := domainGetDomainAndOwner(params.UUID, user); r != nil {
		return r

		// Export the data
	} else if b, err := svc.TheImportExportService.Export(&d.ID); err != nil {
		return respServiceError(err)
	} else {
		// Succeeded. Send the data as a file
		return api_owner.NewDomainExportOK().
			WithContentDisposition(
				fmt.Sprintf(
					`inline; filename="%s-%s.json.gz"`,
					strings.ReplaceAll(d.Host, ":", "-"),
					time.Now().UTC().Format("2006-01-02-15-04-05"))).
			WithPayload(io.NopCloser(bytes.NewReader(b)))
	}
}

// DomainGet returns properties of a domain belonging to the current user
func DomainGet(params api_owner.DomainGetParams, user *data.User) middleware.Responder {
	// Find the domain and verify the user's ownership
	if d, _, r := domainGetDomainAndOwner(params.UUID, user); r != nil {
		return r

		// Prepare a list of federated IdP IDs
	} else if idps, err := svc.TheDomainService.ListDomainFederatedIdPs(&d.ID); err != nil {
		return respServiceError(err)

	} else {
		// Succeeded
		return api_owner.NewDomainGetOK().WithPayload(&api_owner.DomainGetOKBody{
			Domain:          d.ToDTO(),
			FederatedIdpIds: idps,
		})
	}
}

func DomainImport(params api_owner.DomainImportParams, user *data.User) middleware.Responder {
	defer params.Data.Close()

	/* TODO new-db
	// Verify the user owns the domain
	host := models.Host(params.Host)
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), host); r != nil {
		return r
	}

	// Perform import
	*/
	var count int64
	/*var err error
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
	*/

	// Succeeded
	return api_owner.NewDomainImportOK().WithPayload(&api_owner.DomainImportOKBody{NumImported: count})
}

// DomainList returns a list of domain belonging to the user
func DomainList(_ api_owner.DomainListParams, user *data.User) middleware.Responder {
	// Fetch domains by the owner
	domains, err := svc.TheDomainService.ListByOwnerID(&user.ID)
	if err != nil {
		return respServiceError(err)
	}

	// Convert the models
	ds := make([]*models.Domain, len(domains))
	for i, d := range domains {
		ds[i] = d.ToDTO()
	}

	// Succeeded
	return api_owner.NewDomainListOK().WithPayload(&api_owner.DomainListOKBody{Domains: ds})
}

func DomainModeratorDelete(params api_owner.DomainModeratorDeleteParams, user *data.User) middleware.Responder {
	/* TODO new-db
	// Verify the user owns the domain
	host := models.Host(params.Host)
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), host); r != nil {
		return r
	}

	// Delete the moderator from the database
	if err := svc.TheDomainService.DeleteModerator(host, data.EmailPtrToString(params.Body.Email)); err != nil {
		return respServiceError(err)
	}
	*/

	// Succeeded
	return api_owner.NewDomainModeratorDeleteNoContent()
}

func DomainModeratorNew(params api_owner.DomainModeratorNewParams, user *data.User) middleware.Responder {
	/* TODO new-db
	// Verify the user owns the domain
	host := models.Host(params.Host)
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), host); r != nil {
		return r
	}

	// Register a new domain moderator
	if _, err := svc.TheDomainService.CreateModerator(host, data.EmailPtrToString(params.Body.Email)); err != nil {
		return respServiceError(err)
	}
	*/

	// Succeeded
	return api_owner.NewDomainModeratorNewNoContent()
}

func DomainNew(params api_owner.DomainNewParams, user *data.User) middleware.Responder {
	// Properly validate the domain's host (the Swagger pattern only performs a superficial check)
	domain := params.Body.Domain
	if ok, _, _ := util.IsValidHostPort(string(domain.Host)); !ok {
		logger.Warningf("DomainNew(): '%s' is not a valid host[:port]", domain.Host)
		return respBadRequest(ErrorInvalidPropertyValue.WithDetails(string(domain.Host)))
	}

	// Validate identity providers
	for _, id := range params.Body.FederatedIdpIds {
		if _, r := Verifier.FederatedIdProvider(id); r != nil {
			return r
		}
	}

	// Persist a new domain record in the database
	d := &data.Domain{
		ID:               uuid.New(),
		Name:             domain.Name,
		Host:             string(domain.Host),
		CreatedTime:      time.Now().UTC(),
		IsReadonly:       domain.IsReadonly,
		AuthAnonymous:    domain.AuthAnonymous,
		AuthLocal:        domain.AuthLocal,
		AuthSso:          domain.AuthSso,
		SsoURL:           domain.SsoURL,
		ModerationPolicy: data.DomainModerationPolicy(domain.ModerationPolicy),
		ModNotifyPolicy:  data.DomainModNotifyPolicy(domain.ModNotifyPolicy),
		DefaultSort:      string(domain.DefaultSort),
	}
	if err := svc.TheDomainService.Create(&user.ID, d, params.Body.FederatedIdpIds); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainNewOK().WithPayload(d.ToDTO())
}

func DomainSsoSecretNew(params api_owner.DomainSsoSecretNewParams, user *data.User) middleware.Responder {
	/* TODO new-db
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
	*/
	token := models.HexID("")

	// Succeeded
	return api_owner.NewDomainSsoSecretNewOK().WithPayload(&api_owner.DomainSsoSecretNewOKBody{SsoSecret: token})
}

func DomainStatistics(params api_owner.DomainStatisticsParams, user *data.User) middleware.Responder {
	/* TODO new-db
	// Verify the user owns the domain
	host := models.Host(params.Host)
	if r := Verifier.UserOwnsDomain(principal.GetHexID(), host); r != nil {
		return r
	}

	numDays := int(swag.Int64Value(params.NumDays))

	// Collect view stats
	views, err := svc.TheDomainService.StatsForViews(host, principal.GetHexID(), numDays)
	if err != nil {
		return respServiceError(err)
	}

	// Collect comment stats
	comments, err := svc.TheDomainService.StatsForComments(host, principal.GetHexID(), numDays)
	if err != nil {
		return respServiceError(err)
	}
	*/

	// Succeeded
	return api_owner.NewDomainStatisticsOK() /* TODO new-db .WithPayload(&api_owner.DomainStatisticsOKBody{
		CommentCounts: comments,
		ViewCounts:    views,
	})*/
}

// DomainReadonly sets the domain's readonly state
func DomainReadonly(params api_owner.DomainReadonlyParams, user *data.User) middleware.Responder {
	// Find the domain and verify the user's ownership
	if d, _, r := domainGetDomainAndOwner(params.UUID, user); r != nil {
		return r

		// Update the domain status
	} else if err := svc.TheDomainService.SetReadonly(&d.ID, params.Body.Readonly); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainReadonlyNoContent()
}

func DomainUpdate(params api_owner.DomainUpdateParams, user *data.User) middleware.Responder {
	// Find the domain and verify the user's ownership
	newDomain := params.Body.Domain
	domain, _, r := domainGetDomainAndOwner(params.UUID, user)
	if r != nil {
		return r
	}

	// Verify the host isn't changing
	if string(newDomain.Host) != domain.Host {
		return respBadRequest(ErrorImmutableProperty.WithDetails("host"))
	}

	// Validate identity providers
	for _, id := range params.Body.FederatedIdpIds {
		if _, r := Verifier.FederatedIdProvider(id); r != nil {
			return r
		}
	}

	// Update domain properties
	domain.Name = newDomain.Name
	domain.AuthAnonymous = newDomain.AuthAnonymous
	domain.AuthLocal = newDomain.AuthLocal
	domain.AuthSso = newDomain.AuthSso
	domain.SsoURL = newDomain.SsoURL
	domain.ModerationPolicy = data.DomainModerationPolicy(newDomain.ModerationPolicy)
	domain.ModNotifyPolicy = data.DomainModNotifyPolicy(newDomain.ModNotifyPolicy)
	domain.DefaultSort = string(newDomain.DefaultSort)

	// Persist the updated properties
	if err := svc.TheDomainService.Update(domain, params.Body.FederatedIdpIds); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainUpdateOK().WithPayload(domain.ToDTO())
}

// domainGetDomainAndOwner parses a string UUID and fetches the corresponding domain and its user, verifying they own
// the domain
func domainGetDomainAndOwner(domainUUID strfmt.UUID, user *data.User) (*data.Domain, *data.DomainUser, middleware.Responder) {
	// Parse domain ID
	if domainID, err := data.DecodeUUID(domainUUID); err != nil {
		return nil, nil, respBadRequest(ErrorInvalidUUID)

		// Find the domain and domain user
	} else if domain, domainUser, err := svc.TheDomainService.FindDomainUserByID(domainID, &user.ID); err != nil {
		return nil, nil, respServiceError(err)

		// Verify the user owns the domain
	} else if r := Verifier.UserOwnsDomain(domainUser); r != nil {
		return nil, nil, r

	} else {
		// Succeeded
		return domain, domainUser, nil
	}
}
