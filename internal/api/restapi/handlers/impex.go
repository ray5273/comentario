package handlers

import (
	"bytes"
	"fmt"
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_owner"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"io"
)

func DomainExportBegin(params api_owner.DomainExportBeginParams) middleware.Responder {
	// Make sure SMTP is configured
	if !config.SMTPConfigured {
		return respBadRequest(util.ErrorSMTPNotConfigured)
	}

	// Find the owner user
	user, err := svc.TheUserService.FindOwnerByToken(*params.Body.OwnerToken)
	if err != nil {
		return respServiceError(err)
	}

	// Verify the user owns the domain
	domain := data.TrimmedString(params.Body.Domain)
	if r := Verifier.UserOwnsDomain(user.HexID, domain); r != nil {
		return r
	}

	// Initiate domain export in the background
	go domainExport(domain, user.Email)

	// Succeeded
	return api_owner.NewDomainExportBeginNoContent()
}

func DomainExportDownload(params api_owner.DomainExportDownloadParams) middleware.Responder {
	// Fetch the data
	domain, binData, created, err := svc.TheImportExportService.GetExportedData(models.HexID(params.ExportHex))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainExportDownloadOK().
		WithContentDisposition(fmt.Sprintf(`inline; filename="%s-%v.json.gz"`, domain, created.Unix())).
		WithPayload(io.NopCloser(bytes.NewReader(binData)))
}

func DomainImportCommento(params api_owner.DomainImportCommentoParams) middleware.Responder {
	user, err := svc.TheUserService.FindOwnerByToken(*params.Body.OwnerToken)
	if err != nil {
		return respServiceError(err)
	}

	// Verify the user owns the domain
	domain := data.TrimmedString(params.Body.Domain)
	if r := Verifier.UserOwnsDomain(user.HexID, domain); r != nil {
		return r
	}

	// Perform import
	count, err := svc.TheImportExportService.ImportCommento(domain, data.URIToString(params.Body.URL))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainImportCommentoOK().WithPayload(&api_owner.DomainImportCommentoOKBody{NumImported: count})
}

func DomainImportDisqus(params api_owner.DomainImportDisqusParams) middleware.Responder {
	user, err := svc.TheUserService.FindOwnerByToken(*params.Body.OwnerToken)
	if err != nil {
		return respServiceError(err)
	}

	// Verify the user owns the domain
	domain := data.TrimmedString(params.Body.Domain)
	if r := Verifier.UserOwnsDomain(user.HexID, domain); r != nil {
		return r
	}

	// Perform import
	count, err := svc.TheImportExportService.ImportDisqus(domain, data.URIToString(params.Body.URL))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDomainImportDisqusOK().WithPayload(&api_owner.DomainImportDisqusOKBody{NumImported: count})
}

// domainExport performs a domain export, then notifies the user about the outcome using the given email
func domainExport(domain, email string) {
	// Export the data
	if exportHex, err := svc.TheImportExportService.CreateExport(domain); err != nil {
		// Notify the user in a case of failure, ignoring any error
		_ = svc.TheMailService.SendFromTemplate(
			"",
			email,
			"Comentario Data Export Errored",
			"domain-export-error.gohtml",
			map[string]any{"Domain": domain, "Error": util.ErrorInternal.Error()})

	} else {
		// Succeeded. Notify the user by email, ignoring any error
		_ = svc.TheMailService.SendFromTemplate(
			"",
			email,
			"Comentario Data Export",
			"domain-export.gohtml",
			map[string]any{
				"Domain": domain,
				"URL":    config.URLForAPI("domain/export/download", map[string]string{"exportHex": string(exportHex)}),
			})
	}
}
