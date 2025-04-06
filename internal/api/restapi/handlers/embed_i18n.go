package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_embed"
	"gitlab.com/comentario/comentario/internal/svc"
)

func EmbedI18nMessages(params api_embed.EmbedI18nMessagesParams) middleware.Responder {
	// Fetch the messages with fallback
	ms, lang := svc.Services.I18nService().Messages(params.Lang)

	// Convert the source message map into an API map
	mm := exmodels.KeyValueMap(ms)

	// Let the client know what language we are serving, in case of unsupported languages or fallbacks
	mm["_lang"] = lang

	// Succeeded
	return api_embed.NewEmbedI18nMessagesOK().WithPayload(mm)
}
