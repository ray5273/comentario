package handlers

import (
	"bytes"
	"fmt"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/extend/intf"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/persistence"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"io"
	"net/http"
	"strings"
	"time"
)

func DomainClear(params api_general.DomainClearParams, user *data.User) middleware.Responder {
	// Find the domain and verify the user's privileges
	d, _, r := domainGetWithUser(params.UUID, user, true)
	if r != nil {
		return r
	}

	// Clear all domain's users/pages/comments
	err := svc.Services.WithTx(func(tx *persistence.DatabaseTx) error {
		return svc.Services.DomainService(tx).ClearByID(&d.ID)
	})
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDomainClearNoContent()
}

func DomainCount(params api_general.DomainCountParams, user *data.User) middleware.Responder {
	// Query domain count
	if cnt, err := svc.Services.DomainService(nil).CountForUser(&user.ID, swag.BoolValue(params.Owner), swag.BoolValue(params.Moderator)); err != nil {
		return respServiceError(err)
	} else {
		// Succeeded
		return api_general.NewDomainCountOK().WithPayload(int64(cnt))
	}
}

// DomainDelete deletes an existing domain belonging to the current user
func DomainDelete(params api_general.DomainDeleteParams, user *data.User) middleware.Responder {
	// Find the domain and verify the user's privileges
	d, _, r := domainGetWithUser(params.UUID, user, true)
	if r != nil {
		return r
	}

	// Delete the domain and all dependent objects
	err := svc.Services.WithTx(func(tx *persistence.DatabaseTx) error {
		return svc.Services.DomainService(tx).DeleteByID(&d.ID)
	})
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDomainDeleteNoContent()
}

func DomainExport(params api_general.DomainExportParams, user *data.User) middleware.Responder {
	// Find the domain and verify the user's privileges
	d, _, r := domainGetWithUser(params.UUID, user, true)
	if r != nil {
		return r
	}

	// Export the data
	var b []byte
	err := svc.Services.WithTx(func(tx *persistence.DatabaseTx) error {
		var err error
		b, err = svc.Services.ImportExportService(tx).Export(&d.ID)
		return err
	})
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded. Send the data as a file
	return api_general.NewDomainExportOK().
		WithContentDisposition(
			fmt.Sprintf(
				`inline; filename="%s-%s.json.gz"`,
				strings.ReplaceAll(d.Host, ":", "-"),
				time.Now().UTC().Format("2006-01-02-15-04-05"))).
		WithPayload(io.NopCloser(bytes.NewReader(b)))
}

// DomainGet returns properties of a domain belonging to the current user
func DomainGet(params api_general.DomainGetParams, user *data.User) middleware.Responder {
	// Find the domain and verify the user's privileges
	d, du, r := domainGetWithUser(params.UUID, user, false)
	if r != nil {
		return r
	}

	// Fetch domain config
	cfg, err := svc.Services.DomainConfigService(nil).GetAll(&d.ID)
	if err != nil {
		return respServiceError(err)
	}

	// Prepare a list of federated IdP IDs
	idps, err := svc.Services.DomainService(nil).ListDomainFederatedIdPs(&d.ID)
	if err != nil {
		return respServiceError(err)
	}

	// Prepare a list of extensions
	exts, err := svc.Services.DomainService(nil).ListDomainExtensions(&d.ID)
	if err != nil {
		return respServiceError(err)
	}

	// If the user is a superuser, fetch domain attributes
	var attr intf.AttrValues
	if user.IsSuperuser {
		if attr, err = svc.Services.DomainAttrService(nil).GetAll(&d.ID); err != nil {
			return respServiceError(err)
		}
	}

	// Succeeded
	return api_general.NewDomainGetOK().WithPayload(&api_general.DomainGetOKBody{
		Attributes:      attr,
		Configuration:   cfg.ToDTO(),
		Domain:          d.ToDTO(),
		DomainUser:      du.ToDTO(),
		Extensions:      data.SliceToDTOs[*data.DomainExtension, *models.DomainExtension](exts),
		FederatedIdpIds: idps,
	})
}

func DomainImport(params api_general.DomainImportParams, user *data.User) middleware.Responder {
	defer util.LogError(params.Data.Close, "DomainImport, defer Data.Close()")

	// Read the entire data buffer into memory
	expData, err := io.ReadAll(params.Data)
	if err != nil {
		logger.Warningf("DomainImport(): failed to read data buffer: %v", err)
		return respInternalError(nil)
	}

	// Detect data content type and decompress if needed
	ct := http.DetectContentType(expData)
	switch ct {
	case "application/x-gzip":
		expData, err = util.DecompressGzip(expData)
	case "application/zip":
		expData, err = util.DecompressZip(expData)
	case "application/octet-stream":
		return respBadRequest(exmodels.ErrorInvalidInputData.WithDetails("unsupported binary data format"))
	}
	if err != nil {
		logger.Warningf("DomainImport(): failed to decompress data: %v", err)
		return respBadRequest(exmodels.ErrorInvalidInputData.WithDetails("decompression failed"))
	}

	// Find the domain and verify the user's privileges
	domain, _, r := domainGetWithUser(params.UUID, user, true)
	if r != nil {
		return r
	}

	// Perform import
	var res *svc.ImportResult
	err = svc.Services.WithTx(func(tx *persistence.DatabaseTx) error {
		switch params.Source {
		case "comentario":
			res = svc.Services.ImportExportService(tx).Import(user, domain, expData)
			return nil

		case "disqus":
			res = svc.Services.ImportExportService(tx).ImportDisqus(user, domain, expData)
			return nil

		case "wordpress":
			res = svc.Services.ImportExportService(tx).ImportWordPress(user, domain, expData)
			return nil

		default:
			return fmt.Errorf("unknown import source: %q", params.Source)
		}
	})
	if err != nil {
		return respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails(err.Error()))
	}

	// Succeeded
	return api_general.NewDomainImportOK().WithPayload(res.ToDTO())
}

func DomainList(params api_general.DomainListParams, user *data.User) middleware.Responder {
	// Fetch domains the current user has access to
	ds, dus, err := svc.Services.DomainService(nil).ListByDomainUser(
		&user.ID, // Fetch domain users for the current user themselves
		&user.ID,
		user.IsSuperuser,
		false,
		swag.StringValue(params.Filter),
		swag.StringValue(params.SortBy),
		data.SortDirection(swag.BoolValue(params.SortDesc)),
		data.PageIndex(params.Page))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDomainListOK().
		WithPayload(&api_general.DomainListOKBody{
			DomainUsers: data.SliceToDTOs[*data.DomainUser, *models.DomainUser](dus),
			Domains:     data.SliceToDTOs[*data.Domain, *models.Domain](ds),
		})
}

func DomainNew(params api_general.DomainNewParams, user *data.User) middleware.Responder {
	// Check if the user is allowed to add a domain
	if r := Verifier.UserCanAddDomain(user); r != nil {
		return r
	}

	// Prepare a DB model
	d := &data.Domain{
		ID:          uuid.New(),
		CreatedTime: time.Now().UTC(),
	}
	d.FromDTO(params.Body.Domain)

	// Properly validate the domain's host (the Swagger pattern only performs a superficial check)
	if r := Verifier.DomainHostCanBeAdded(d.Host); r != nil {
		return r
	}

	// Validate domain configuration
	if r := Verifier.DomainConfigItems(params.Body.Configuration); r != nil {
		return r
	}

	// Validate identity providers
	if r := Verifier.FederatedIdProviders(params.Body.FederatedIdpIds); r != nil {
		return r
	}

	// Convert extensions
	exts, r := domainConvertExtensions(params.Body.Extensions)
	if r != nil {
		return r
	}

	// Run in a transaction
	err := svc.Services.WithTx(func(tx *persistence.DatabaseTx) error {
		ds := svc.Services.DomainService(tx)
		return util.RunCheckErr([]util.ErrFunc{
			// Persist a new domain record in the database
			func() error { return ds.Create(&user.ID, d) },
			// Update domain config
			func() error {
				return svc.Services.DomainConfigService(tx).Update(&d.ID, &user.ID, data.DynConfigDTOsToMap(params.Body.Configuration))
			},
			// Store the domain's IdPs
			func() error { return ds.SaveIdPs(&d.ID, params.Body.FederatedIdpIds) },
			// Store the domain's extensions
			func() error { return ds.SaveExtensions(&d.ID, exts) },
		})
	})
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDomainNewOK().WithPayload(d.ToDTO())
}

func DomainPurge(params api_general.DomainPurgeParams, user *data.User) middleware.Responder {
	// Find the domain and verify the user's privileges
	d, _, r := domainGetWithUser(params.UUID, user, true)
	if r != nil {
		return r
	}

	// Purge comments
	var cnt int64
	err := svc.Services.WithTx(func(tx *persistence.DatabaseTx) error {
		var err error
		cnt, err = svc.Services.DomainService(tx).PurgeByID(&d.ID, params.Body.MarkedDeleted, params.Body.UserCreatedDeleted)
		return err
	})
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDomainPurgeOK().WithPayload(&api_general.DomainPurgeOKBody{CommentCount: cnt})
}

func DomainSsoSecretNew(params api_general.DomainSsoSecretNewParams, user *data.User) middleware.Responder {
	// Find the domain and verify the user's privileges
	d, _, r := domainGetWithUser(params.UUID, user, true)
	if r != nil {
		return r
	}

	// Generate a new SSO secret for the domain
	var ss string
	err := svc.Services.WithTx(func(tx *persistence.DatabaseTx) error {
		var err error
		ss, err = svc.Services.DomainService(tx).GenerateSSOSecret(&d.ID)
		return err
	})
	if err != nil {
		return respServiceError(err)

	}

	// Succeeded
	return api_general.NewDomainSsoSecretNewOK().WithPayload(&api_general.DomainSsoSecretNewOKBody{SsoSecret: ss})
}

// DomainReadonly sets the domain's readonly state
func DomainReadonly(params api_general.DomainReadonlyParams, user *data.User) middleware.Responder {
	// Find the domain and verify the user's privileges
	d, _, r := domainGetWithUser(params.UUID, user, true)
	if r != nil {
		return r
	}

	// Update the domain status
	err := svc.Services.WithTx(func(tx *persistence.DatabaseTx) error {
		return svc.Services.DomainService(tx).SetReadonly(&d.ID, swag.BoolValue(params.Body.Readonly))
	})
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDomainReadonlyNoContent()
}

func DomainUpdate(params api_general.DomainUpdateParams, user *data.User) middleware.Responder {
	// Find the domain and verify the user's privileges
	domain, _, r := domainGetWithUser(params.UUID, user, true)
	if r != nil {
		return r
	}

	// Verify the host isn't changing
	if string(params.Body.Domain.Host) != domain.Host {
		return respBadRequest(exmodels.ErrorImmutableProperty.WithDetails("host"))
	}

	// Validate domain configuration
	if r := Verifier.DomainConfigItems(params.Body.Configuration); r != nil {
		return r
	}

	// Validate identity providers
	if r := Verifier.FederatedIdProviders(params.Body.FederatedIdpIds); r != nil {
		return r
	}

	// Convert extensions
	exts, r := domainConvertExtensions(params.Body.Extensions)
	if r != nil {
		return r
	}

	// Update domain properties
	domain.FromDTO(params.Body.Domain)

	// Persist the updated properties
	err := svc.Services.WithTx(func(tx *persistence.DatabaseTx) error {
		ds := svc.Services.DomainService(tx)
		return util.RunCheckErr([]util.ErrFunc{
			// Update the domain record in the database
			func() error { return ds.Update(domain) },
			// Update domain config
			func() error {
				return svc.Services.DomainConfigService(tx).Update(&domain.ID, &user.ID, data.DynConfigDTOsToMap(params.Body.Configuration))
			},
			// Store the domain's IdPs
			func() error { return ds.SaveIdPs(&domain.ID, params.Body.FederatedIdpIds) },
			// Store the domain's extensions
			func() error { return ds.SaveExtensions(&domain.ID, exts) },
		})
	})
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDomainUpdateOK().WithPayload(domain.ToDTO())
}

// domainConvertExtensions converts domain extensions from DTOs into data models, verifying the given extensions are enabled
func domainConvertExtensions(exIn []*models.DomainExtension) ([]*data.DomainExtension, middleware.Responder) {
	var exOut []*data.DomainExtension
	for _, e := range exIn {
		// Check the extension is known
		if ex, ok := data.DomainExtensions[e.ID]; !ok {
			return nil, respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails(fmt.Sprintf("unknown extension (ID=%q)", e.ID)))

			// Check the extension is enabled
		} else if !ex.Enabled {
			return nil, respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails(fmt.Sprintf("extension (ID=%q) is disabled", e.ID)))

		} else {
			// Convert the model
			exOut = append(exOut, &data.DomainExtension{
				ID:      ex.ID,
				Name:    ex.Name,
				Config:  e.Config,
				Enabled: true,
			})
		}
	}
	return exOut, nil
}

// domainGet parses a string UUID and fetches the corresponding domain
func domainGet(domainUUID strfmt.UUID) (*data.Domain, middleware.Responder) {
	// Parse domain ID
	if domainID, r := parseUUID(domainUUID); r != nil {
		return nil, r

		// Find the domain
	} else if domain, err := svc.Services.DomainService(nil).FindByID(domainID); err != nil {
		return nil, respServiceError(err)

	} else {
		// Succeeded
		return domain, nil
	}
}

// domainGetWithUser parses a string UUID and fetches the corresponding domain and its user, optionally verifying they
// are allowed to manage the domain
func domainGetWithUser(domainUUID strfmt.UUID, user *data.User, checkCanManage bool) (*data.Domain, *data.DomainUser, middleware.Responder) {
	// Parse domain ID
	if domainID, r := parseUUID(domainUUID); r != nil {
		return nil, nil, r

		// Find the domain and domain user
	} else if domain, domainUser, err := svc.Services.DomainService(nil).FindDomainUserByID(domainID, &user.ID, false); err != nil {
		return nil, nil, respServiceError(err)

	} else {
		// Verify the user can manage the domain, if necessary
		if checkCanManage {
			if r := Verifier.UserCanManageDomain(user, domainUser); r != nil {
				return nil, nil, r
			}

			// If no user record is present, the user isn't allowed to view the domain at all (unless it's a superuser)
		} else if !user.IsSuperuser && domainUser == nil {
			return nil, nil, respForbidden(exmodels.ErrorUnauthorized)
		}

		// Apply the user's authorisations
		domain = domain.CloneWithClearance(user.IsSuperuser, domainUser.IsAnOwner())

		// Succeeded
		return domain, domainUser, nil
	}
}
