package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/v3/internal/api/exmodels"
	"gitlab.com/comentario/comentario/v3/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/v3/internal/data"
	"gitlab.com/comentario/comentario/v3/internal/svc"
)

func DashboardDailyStats(params api_general.DashboardDailyStatsParams, user *data.User) middleware.Responder {
	// Extract and parse the parameters
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

func DashboardPageStats(params api_general.DashboardPageStatsParams, user *data.User) middleware.Responder {
	// Extract and parse the parameters
	numDays := int(swag.Uint64Value(params.Days))
	domainID, r := parseUUIDPtr(params.Domain)
	if r != nil {
		return r
	}

	// Collect view stats
	vc, err := svc.TheStatsService.GetTopPages(user.IsSuperuser, "views", &user.ID, domainID, numDays, 5)
	if err != nil {
		return respServiceError(err)
	}

	// Collect comment stats
	cc, err := svc.TheStatsService.GetTopPages(user.IsSuperuser, "comments", &user.ID, domainID, numDays, 5)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDashboardPageStatsOK().WithPayload(&api_general.DashboardPageStatsOKBody{
		Comments: cc,
		Views:    vc,
	})
}

func DashboardPageViewStats(params api_general.DashboardPageViewStatsParams, user *data.User) middleware.Responder {
	// Extract and parse the parameters
	numDays := int(swag.Uint64Value(params.Days))
	domainID, r := parseUUIDPtr(params.Domain)
	if r != nil {
		return r
	}

	// Translate the dimension into a column name
	var dim string
	switch params.Dimension {
	case "proto":
		dim = "proto"
	case "country":
		dim = "country"
	case "browser":
		dim = "ua_browser_name"
	case "os":
		dim = "ua_os_name"
	case "device":
		dim = "ua_device"
	default:
		return respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails("dimension"))
	}

	// Collect stats
	stats, err := svc.TheStatsService.GetViewStats(user.IsSuperuser, dim, &user.ID, domainID, numDays)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDashboardPageViewStatsOK().WithPayload(stats)
}

func DashboardTotals(_ api_general.DashboardTotalsParams, user *data.User) middleware.Responder {
	// Query the data
	totals, err := svc.TheStatsService.GetTotals(user)
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDashboardTotalsOK().WithPayload(totals.ToDTO())
}
