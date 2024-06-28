package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
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
	numDays := int(swag.Uint64Value(params.Days))
	domainID, r := parseUUIDPtr(params.Domain)
	if r != nil {
		return r
	}

	// Collect stats
	var counts []uint64
	var err error
	switch params.Metric {
	case "comments":
		counts, err = svc.TheStatsService.GetDailyCommentCounts(user.IsSuperuser, &user.ID, domainID, numDays)

	case "domainUsers":
		counts, err = svc.TheStatsService.GetDailyDomainUserCounts(user.IsSuperuser, &user.ID, domainID, numDays)

	case "domainPages":
		counts, err = svc.TheStatsService.GetDailyDomainPageCounts(user.IsSuperuser, &user.ID, domainID, numDays)

	case "views":
		counts, err = svc.TheStatsService.GetDailyViewCounts(user.IsSuperuser, &user.ID, domainID, numDays)

	default:
		return respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails(params.Metric))
	}

	// Check for error
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDashboardDailyStatsOK().WithPayload(counts)
}
