package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
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

// DashboardStatisticsGet returns summary ("dashboard") data for the user
func DashboardStatisticsGet(params api_owner.DashboardStatisticsGetParams, principal data.Principal) middleware.Responder {
	numDays := int(swag.Int64Value(params.NumDays))

	// Collect view stats
	views, err := svc.TheDomainService.StatsForViews("", principal.GetHexID(), numDays)
	if err != nil {
		return respServiceError(err)
	}

	// Collect comment stats
	comments, err := svc.TheDomainService.StatsForComments("", principal.GetHexID(), numDays)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_owner.NewDashboardStatisticsGetOK().WithPayload(&api_owner.DashboardStatisticsGetOKBody{
		CommentCounts: comments,
		ViewCounts:    views,
	})
}
