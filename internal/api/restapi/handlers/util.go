package handlers

import (
	"errors"
	"github.com/go-openapi/runtime"
	"github.com/go-openapi/runtime/middleware"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/svc"
	"net/http"
	"time"
)

// logger represents a package-wide logger instance
var logger = logging.MustGetLogger("handlers")

// closeParentWindowResponse returns a responder that renders an HTML script closing the parent window
func closeParentWindowResponse() middleware.Responder {
	return NewHTMLResponder(http.StatusOK, "<html><script>window.parent.close();</script></html>")
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
		Secure:   config.UseHTTPS,
		HttpOnly: httpOnly,
		SameSite: sameSite,
	}
	return r
}

// WithoutCookie removes a cookie in the response by submitting a "pre-expired" cookie
func (r *CookieResponder) WithoutCookie(name, path string) *CookieResponder {
	r.cookies[name] = &http.Cookie{Name: name, Path: path, MaxAge: -1}
	return r
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
	case errors.Is(err, svc.ErrEmailSend):
		return api_general.NewGenericBadGateway().WithPayload(ErrorEmailSendFailure)
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
