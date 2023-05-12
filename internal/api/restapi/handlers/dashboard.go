package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_owner"
	"gitlab.com/comentario/comentario/internal/data"
)

// DashboardDataGet returns summary ("dashboard") data for the user
func DashboardDataGet(_ api_owner.DashboardDataGetParams, user *data.User) middleware.Responder {
	// Query the data
	d := &api_owner.DashboardDataGetOKBody{}
	/* TODO new-db
	var err error
	d.CountDomains, d.CountPages, d.CountComments, d.CountCommenters, err = svc.TheDomainService.StatsForOwner(principal.GetHexID())
	if err != nil {
		return respServiceError(err)
	}
	*/

	// Succeeded
	return api_owner.NewDashboardDataGetOK().WithPayload(d)
}

// DashboardStatisticsGet returns summary ("dashboard") data for the user
func DashboardStatisticsGet(params api_owner.DashboardStatisticsGetParams, user *data.User) middleware.Responder {
	/* TODO new-db
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
	*/
	return api_owner.NewDashboardStatisticsGetOK()
}
