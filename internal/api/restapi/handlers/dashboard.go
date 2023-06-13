package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
)

func DashboardTotals(_ api_general.DashboardTotalsParams, user *data.User) middleware.Responder {
	// Query the data
	d := &api_general.DashboardTotalsOKBody{}
	var err error
	d.CountDomains, d.CountPages, d.CountComments, d.CountCommenters, err = svc.TheDomainService.StatsTotalsForUser(&user.ID)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDashboardTotalsOK().WithPayload(d)
}

func DashboardDailyStats(params api_general.DashboardDailyStatsParams, user *data.User) middleware.Responder {
	// Collect comment/view stats
	comments, views, err := svc.TheDomainService.StatsDaily(&user.ID, nil, int(swag.Uint64Value(params.Days)))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDashboardDailyStatsOK().WithPayload(&models.DailyViewCommentStats{
		CommentCounts: comments,
		ViewCounts:    views,
	})
}
