package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_owner"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
)

// DashboardDataGet returns summary ("dashboard") data for the user
func DashboardDataGet(_ api_owner.DashboardDataGetParams, principal data.Principal) middleware.Responder {
	// Query the data
	d := &api_owner.DashboardDataGetOKBody{}
	var err error
	d.CountDomains, d.CountPages, d.CountComments, d.CountCommenters, err = svc.TheDomainService.StatsForOwner(principal.GetHexID())
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDashboardDataGetOK().WithPayload(d)
}
