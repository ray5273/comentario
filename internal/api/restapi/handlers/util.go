package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/go-openapi/runtime"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/strfmt/conv"
	"github.com/google/uuid"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"net/http"
	"time"
)

// logger represents a package-wide logger instance
var logger = logging.MustGetLogger("handlers")

// closeParentWindowResponse returns a responder that renders an HTML script closing the parent window
func closeParentWindowResponse() middleware.Responder {
	return NewHTMLResponder(http.StatusOK, "<html><script>window.parent.close();</script></html>")
}

// postNonInteractiveLoginResponse returns a responder that renders an HTML script posting an SSO login response to the
// parent window. If errMessage == "", it's success response, otherwise an error
func postNonInteractiveLoginResponse(errMessage string) middleware.Responder {
	// Prepare a response message payload
	ssoResponse := struct {
		Type    string `json:"type"`
		Success bool   `json:"success"`
		Error   string `json:"error,omitempty"`
	}{
		Type:    "auth.sso.result",
		Success: errMessage == "",
		Error:   errMessage,
	}

	// Marshal the response object into a string
	b, err := json.Marshal(ssoResponse)
	if err != nil {
		b = []byte(`{"success":"false","error":"JSON marshalling failed"}`)
	}

	// Send the response as a script wrapped in HTML
	return NewHTMLResponder(
		http.StatusOK,
		fmt.Sprintf("<html><script>window.parent.postMessage(%s, '*');</script></html>", b))
}

//----------------------------------------------------------------------------------------------------------------------

// HTMLResponder is an implementation of middleware.Responder that serves out a static piece of HTML
type HTMLResponder struct {
	code int
	html string
}

// NewHTMLResponder creates HTMLResponder with default headers values
func NewHTMLResponder(code int, html string) *HTMLResponder {
	return &HTMLResponder{
		code: code,
		html: html,
	}
}

// WriteResponse to the client
func (r *HTMLResponder) WriteResponse(w http.ResponseWriter, _ runtime.Producer) {
	w.WriteHeader(r.code)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(r.html))
}

// ----------------------------------------------------------------------------------------------------------------------

// CookieResponder is an implementation of middleware.Responder that wraps another responder and sets the provided
// cookies before handing over to it
type CookieResponder struct {
	responder middleware.Responder
	cookies   map[string]*http.Cookie
}

// NewCookieResponder instantiates a new CookieResponder
func NewCookieResponder(responder middleware.Responder) *CookieResponder {
	return &CookieResponder{
		responder: responder,
		cookies:   make(map[string]*http.Cookie),
	}
}

func (r *CookieResponder) WriteResponse(rw http.ResponseWriter, p runtime.Producer) {
	// Add cookies to the response
	for _, c := range r.cookies {
		http.SetCookie(rw, c)
	}
	// Hand over to the original responder
	r.responder.WriteResponse(rw, p)
}

// WithCookie adds a new cookie to the response
func (r *CookieResponder) WithCookie(name, value, path string, maxAge time.Duration, httpOnly bool, sameSite http.SameSite) *CookieResponder {
	r.cookies[name] = &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     path,
		MaxAge:   int(maxAge.Seconds()),
		Secure:   config.ServerConfig.UseHTTPS(),
		HttpOnly: httpOnly,
		SameSite: sameSite,
	}
	return r
}

// WithoutCookie removes a cookie in the response by submitting a "pre-expired" cookie
func (r *CookieResponder) WithoutCookie(name, path string) *CookieResponder {
	r.cookies[name] = &http.Cookie{
		Name:   name,
		Path:   path,
		MaxAge: -1,
		// Allow sending it cross-origin, but only via HTTPS as only a secure cookie can use SameSite=None
		SameSite: util.If(config.ServerConfig.UseHTTPS(), http.SameSiteNoneMode, http.SameSiteLaxMode),
	}
	return r
}

// parseUUID parses a strfmt.UUID and returns a *uuid.UUID or an error responder
func parseUUID(sid strfmt.UUID) (*uuid.UUID, middleware.Responder) {
	u, err := data.DecodeUUID(sid)
	if err != nil {
		return nil, respBadRequest(exmodels.ErrorInvalidUUID.WithDetails(string(sid)))
	}
	return u, nil
}

// parseUUIDPtr parses a nillable *strfmt.UUID and returns a (nillable) *uuid.UUID or an error responder
func parseUUIDPtr(pid *strfmt.UUID) (*uuid.UUID, middleware.Responder) {
	u, err := data.DecodeUUIDPtr(pid)
	if err != nil {
		return nil, respBadRequest(exmodels.ErrorInvalidUUID.WithDetails(string(conv.UUIDValue(pid))))
	}
	return u, nil
}

// respBadRequest returns a responder that responds with HTTP Bad Request error
func respBadRequest(err *exmodels.Error) middleware.Responder {
	return api_general.NewGenericBadRequest().WithPayload(err)
}

// respForbidden returns a responder that responds with HTTP Forbidden error
func respForbidden(err *exmodels.Error) middleware.Responder {
	return api_general.NewGenericForbidden().WithPayload(err)
}

// respInternalError returns a responder that responds with HTTP Internal Server Error
func respInternalError(err *exmodels.Error) middleware.Responder {
	return api_general.NewGenericInternalServerError().WithPayload(err)
}

// respNotFound returns a responder that responds with HTTP Not Found
func respNotFound(err *exmodels.Error) middleware.Responder {
	return api_general.NewGenericNotFound().WithPayload(err)
}

// respServiceError translates the provided error, returned by a service, into an appropriate error responder. The idea
// behind this translation is to provide the user with some meaningful information about the failure, while keeping
// any sensitive data (which is otherwise supposed to land in the logs) out of the response
func respServiceError(err error) middleware.Responder {
	switch {
	case errors.Is(err, svc.ErrCommentTooLong):
		return api_general.NewGenericUnprocessableEntity().WithPayload(exmodels.ErrorCommentTextTooLong)
	case errors.Is(err, svc.ErrEmailSend):
		return api_general.NewGenericBadGateway().WithPayload(exmodels.ErrorEmailSendFailure)
	case errors.Is(err, svc.ErrResourceFetch):
		return api_general.NewGenericBadGateway().WithPayload(exmodels.ErrorResourceFetchFailed)
	case errors.Is(err, svc.ErrNotFound):
		return api_general.NewGenericNotFound()
	}

	// Not recognised: return an internal error response
	logger.Errorf("Service error: %v", err)
	return respInternalError(nil)
}

// respUnauthorized returns a responder that responds with HTTP Unauthorized error
func respUnauthorized(err *exmodels.Error) middleware.Responder {
	return api_general.NewGenericUnauthorized().WithPayload(err)
}
