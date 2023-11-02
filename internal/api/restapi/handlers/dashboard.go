package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
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

func DashboardDailyStatsComments(params api_general.DashboardDailyStatsCommentsParams, user *data.User) middleware.Responder {
	numDays := int(swag.Uint64Value(params.Days))
	domainID, r := parseUUIDPtr(params.Domain)
	if r != nil {
		return r
	}

	// Collect stats
	counts, err := svc.TheStatsService.GetDailyCommentCounts(user.IsSuperuser, &user.ID, domainID, numDays)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDashboardDailyStatsCommentsOK().WithPayload(counts)
}

func DashboardDailyStatsPages(params api_general.DashboardDailyStatsPagesParams, user *data.User) middleware.Responder {
	numDays := int(swag.Uint64Value(params.Days))
	domainID, r := parseUUIDPtr(params.Domain)
	if r != nil {
		return r
	}

	// Collect stats
	counts, err := svc.TheStatsService.GetDailyPageCounts(user.IsSuperuser, &user.ID, domainID, numDays)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDashboardDailyStatsPagesOK().WithPayload(counts)
}

func DashboardDailyStatsViews(params api_general.DashboardDailyStatsViewsParams, user *data.User) middleware.Responder {
	numDays := int(swag.Uint64Value(params.Days))
	domainID, r := parseUUIDPtr(params.Domain)
	if r != nil {
		return r
	}

	// Collect stats
	counts, err := svc.TheStatsService.GetDailyViewCounts(user.IsSuperuser, &user.ID, domainID, numDays)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDashboardDailyStatsViewsOK().WithPayload(counts)
}
