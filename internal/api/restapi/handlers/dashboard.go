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
	totals, err := svc.TheStatsService.GetTotals(user)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDashboardTotalsOK().WithPayload(totals.ToDTO())
}

func DashboardDailyStats(params api_general.DashboardDailyStatsParams, user *data.User) middleware.Responder {
	// Collect comment/view stats
	comments, views, err := svc.TheStatsService.GetDailyStats(&user.ID, nil, int(swag.Uint64Value(params.Days)))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDashboardDailyStatsOK().WithPayload(&models.StatsDailyViewsComments{
		CommentCounts: comments,
		ViewCounts:    views,
	})
}
