package restapi

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_e2e"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
)

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

func E2eReset(api_e2e.E2eResetParams) middleware.Responder {
	if err := e2eHandler.HandleReset(); err != nil {
		logger.Errorf("E2eReset failed: %v", err)
		return api_general.NewGenericInternalServerError()
	}
	return api_e2e.NewE2eResetNoContent()
}
