package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_embed"
	"gitlab.com/comentario/comentario/internal/svc"
)

func EmbedI18nMessages(params api_embed.EmbedI18nMessagesParams) middleware.Responder {
	// Fetch the messages
	ms, err := svc.TheI18nService.Messages(params.Lang)
	if err != nil {
		return respServiceError(err)
	}

	// Convert the messages into DTOs
	dtos := make([]*models.I18nMessage, len(ms))
	for i, m := range ms {
		dtos[i] = &models.I18nMessage{
			ID:          m.ID,
			Translation: m.Other,
		}
	}

	// Succeeded
	return api_embed.NewEmbedI18nMessagesOK().WithPayload(dtos)
}
