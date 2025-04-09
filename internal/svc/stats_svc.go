package svc

import (
	"database/sql"
	"fmt"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/persistence"
	"gitlab.com/comentario/comentario/internal/util"
	"time"
)

// StatsService is a service interface for dealing with stats
type StatsService interface {
	persistence.TxAware
	// GetDailyCommentCounts collects and returns a daily statistics for comments, optionally limited to a specific
	// domain
	GetDailyCommentCounts(isSuperuser bool, userID, domainID *uuid.UUID, numDays int) ([]uint64, error)
	// GetDailyDomainPageCounts collects and returns a daily statistics for domain pages, optionally limited to a
	// specific domain
	GetDailyDomainPageCounts(isSuperuser bool, userID, domainID *uuid.UUID, numDays int) ([]uint64, error)
	// GetDailyDomainUserCounts collects and returns a daily statistics for domain users, optionally limited to a
	// specific domain
	GetDailyDomainUserCounts(isSuperuser bool, userID, domainID *uuid.UUID, numDays int) ([]uint64, error)
	// GetDailyViewCounts collects and returns a daily statistics for views, optionally limited to a specific domain
	GetDailyViewCounts(isSuperuser bool, userID, domainID *uuid.UUID, numDays int) ([]uint64, error)
	// GetTopPages collects and returns top num performing page items by the given property prop (either "views" or
	// "comments")
	GetTopPages(isSuperuser bool, prop string, userID, domainID *uuid.UUID, numDays, num int) ([]*exmodels.PageStatsItem, error)
	// GetTotals collects and returns total figures for all domains accessible to the specified user
	GetTotals(curUser *data.User) (*StatsTotals, error)
	// GetViewStats returns view numbers for the given dimension values, optionally limited to a specific domain
	GetViewStats(isSuperuser bool, dimension string, userID, domainID *uuid.UUID, numDays int) (exmodels.StatsDimensionCounts, error)
}

//----------------------------------------------------------------------------------------------------------------------

// statsService is a blueprint StatsService implementation
type statsService struct{ dbTxAware }

func (svc *statsService) GetDailyCommentCounts(isSuperuser bool, userID, domainID *uuid.UUID, numDays int) ([]uint64, error) {
	logger.Debugf("statsService.GetDailyCommentCounts(%v, %s, %s, %d)", isSuperuser, userID, domainID, numDays)

	// Calculate the start date
	numDays, start := getStatsStartDate(numDays)

	// Prepare a query for comment counts, grouped by day
	date := db.StartOfDay("c.ts_created")
	q := svc.dbx().From(goqu.T("cm_comments").As("c")).
		Select(goqu.COUNT("*").As("cnt"), date.As("date")).
		Join(goqu.T("cm_domain_pages").As("p"), goqu.On(goqu.Ex{"p.id": goqu.I("c.page_id")})).
		// Filter by domain
		Join(goqu.T("cm_domains").As("d"), goqu.On(goqu.Ex{"d.id": goqu.I("p.domain_id")})).
		// Select only last N days, and exclude deleted
		Where(goqu.I("c.ts_created").Gte(start), goqu.I("c.is_deleted").IsFalse()).
		GroupBy(date).
		Order(date.Asc())

	// Filter by domain, if any
	if domainID != nil {
		q = q.Where(goqu.Ex{"d.id": domainID})
	}

	// If the user isn't a superuser, filter by owned domains
	if !isSuperuser {
		q = addStatsOwnedDomainFilter(q, userID)
	}

	// Query data
	return svc.queryDailyStats(q, start, numDays)
}

func (svc *statsService) GetDailyDomainUserCounts(isSuperuser bool, userID, domainID *uuid.UUID, numDays int) ([]uint64, error) {
	logger.Debugf("statsService.GetDailyDomainUserCounts(%v, %s, %s, %d)", isSuperuser, userID, domainID, numDays)

	// Calculate the start date
	numDays, start := getStatsStartDate(numDays)

	// Prepare a query for comment counts, grouped by day
	date := db.StartOfDay("u.ts_created")
	q := svc.dbx().From(goqu.T("cm_domains_users").As("u")).
		Select(goqu.COUNT("*").As("cnt"), date.As("date")).
		// Filter by domain
		Join(goqu.T("cm_domains").As("d"), goqu.On(goqu.Ex{"d.id": goqu.I("u.domain_id")})).
		// Select only last N days
		Where(goqu.I("u.ts_created").Gte(start)).
		GroupBy(date).
		Order(date.Asc())

	// Filter by domain, if any
	if domainID != nil {
		q = q.Where(goqu.Ex{"d.id": domainID})
	}

	// If the user isn't a superuser, filter by owned domains
	if !isSuperuser {
		q = addStatsOwnedDomainFilter(q, userID)
	}

	// Query data
	return svc.queryDailyStats(q, start, numDays)
}

func (svc *statsService) GetDailyDomainPageCounts(isSuperuser bool, userID, domainID *uuid.UUID, numDays int) ([]uint64, error) {
	logger.Debugf("statsService.GetDailyDomainPageCounts(%v, %s, %s, %d)", isSuperuser, userID, domainID, numDays)

	// Calculate the start date
	numDays, start := getStatsStartDate(numDays)

	// Prepare a query for comment counts, grouped by day
	date := db.StartOfDay("p.ts_created")
	q := svc.dbx().From(goqu.T("cm_domain_pages").As("p")).
		Select(goqu.COUNT("*").As("cnt"), date.As("date")).
		// Filter by domain
		Join(goqu.T("cm_domains").As("d"), goqu.On(goqu.Ex{"d.id": goqu.I("p.domain_id")})).
		// Select only last N days
		Where(goqu.I("p.ts_created").Gte(start)).
		GroupBy(date).
		Order(date.Asc())

	// Filter by domain, if any
	if domainID != nil {
		q = q.Where(goqu.Ex{"d.id": domainID})
	}

	// If the user isn't a superuser, filter by owned domains
	if !isSuperuser {
		q = addStatsOwnedDomainFilter(q, userID)
	}

	// Query data
	return svc.queryDailyStats(q, start, numDays)
}

func (svc *statsService) GetDailyViewCounts(isSuperuser bool, userID, domainID *uuid.UUID, numDays int) ([]uint64, error) {
	logger.Debugf("statsService.GetDailyViewCounts(%v, %s, %s, %d)", isSuperuser, userID, domainID, numDays)

	// Return a nil slice unless stats gathering is enabled
	if config.ServerConfig.DisablePageViewStats {
		return nil, nil
	}

	// Calculate the start date
	numDays, start := getStatsStartDate(numDays)

	// Prepare a query for view counts, grouped by day
	date := db.StartOfDay("v.ts_created")
	q := svc.dbx().From(goqu.T("cm_domain_page_views").As("v")).
		Select(goqu.COUNT("*").As("cnt"), date.As("date")).
		Join(goqu.T("cm_domain_pages").As("p"), goqu.On(goqu.Ex{"p.id": goqu.I("v.page_id")})).
		// Filter by domain
		Join(goqu.T("cm_domains").As("d"), goqu.On(goqu.Ex{"d.id": goqu.I("p.domain_id")})).
		// Select only last N days
		Where(goqu.I("v.ts_created").Gte(start)).
		GroupBy(date).
		Order(date.Asc())

	// Filter by domain, if any
	if domainID != nil {
		q = q.Where(goqu.Ex{"d.id": domainID})
	}

	// If the user isn't a superuser, filter by owned domains
	if !isSuperuser {
		q = addStatsOwnedDomainFilter(q, userID)
	}

	// Query view data
	return svc.queryDailyStats(q, start, numDays)
}

func (svc *statsService) GetTopPages(isSuperuser bool, prop string, userID, domainID *uuid.UUID, numDays, num int) ([]*exmodels.PageStatsItem, error) {
	logger.Debugf("statsService.GetTopPages(%v, %q, %s, %s, %d, %d)", isSuperuser, prop, userID, domainID, numDays, num)

	// Return a nil slice unless stats gathering is enabled
	if config.ServerConfig.DisablePageViewStats {
		return nil, nil
	}

	// Calculate the start date
	numDays, start := getStatsStartDate(numDays)

	// Prepare a counting query, grouped by page
	q := svc.dbx().From(goqu.T("cm_domain_pages").As("p")).
		Select(
			// Domain page fields
			"p.domain_id", "p.id", "p.path", "p.title",
			// Domain fields
			goqu.I("d.host").As("domain_host"),
			// Aggregate count
			goqu.COUNT("*").As("cnt")).
		// Join the domain
		Join(goqu.T("cm_domains").As("d"), goqu.On(goqu.Ex{"d.id": goqu.I("p.domain_id")})).
		GroupBy("d.host", "p.id").
		// Sort by count, descending, then, additionally, by page ID for stable ordering
		Order(goqu.I("cnt").Desc(), goqu.I("p.id").Asc()).
		Limit(uint(num))

	// Set up a roll-up condition
	switch prop {
	case "views":
		q = q.
			// Join the page's views
			Join(goqu.T("cm_domain_page_views").As("v"), goqu.On(goqu.Ex{"v.page_id": goqu.I("p.id")})).
			// Select only last N days
			Where(goqu.I("v.ts_created").Gte(start))
	case "comments":
		q = q.
			// Join the page's comments
			Join(goqu.T("cm_comments").As("c"), goqu.On(goqu.Ex{"c.page_id": goqu.I("p.id")})).
			// Select only last N days, and exclude deleted
			Where(goqu.I("c.ts_created").Gte(start), goqu.I("c.is_deleted").IsFalse())
	default:
		return nil, fmt.Errorf("statsService.GetTopPages: invalid prop value %q", prop)
	}

	// Filter by domain, if any
	if domainID != nil {
		q = q.Where(goqu.Ex{"d.id": domainID})
	}

	// If the user isn't a superuser, filter by owned domains
	if !isSuperuser {
		q = addStatsOwnedDomainFilter(q, userID)
	}

	// Query the data
	var dbRecs []*exmodels.PageStatsItem
	if err := q.ScanStructs(&dbRecs); err != nil {
		logger.Errorf("statsService.GetTopPages: ScanStructs() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return dbRecs, nil
}

func (svc *statsService) GetTotals(curUser *data.User) (*StatsTotals, error) {
	logger.Debugf("statsService.GetTotals(%s)", &curUser.ID)
	totals := &StatsTotals{CountUsersTotal: -1, CountUsersBanned: -1, CountUsersNonBanned: -1}

	// Collect stats for domains, domain pages, and domain users
	if err := svc.fillDomainPageUserStats(curUser, totals); err != nil {
		return nil, translateDBErrors(err)
	}

	// If the current user is a superuser, query numbers of users
	if curUser.IsSuperuser {
		if err := svc.fillUserStats(totals); err != nil {
			return nil, translateDBErrors(err)
		}
	}

	// Collect stats for comments and commenters
	if err := svc.fillCommentCommenterStats(curUser, totals); err != nil {
		return nil, translateDBErrors(err)
	}

	// Collect stats for own comments and pages
	if err := svc.fillOwnStats(curUser, totals); err != nil {
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return totals, nil
}
func (svc *statsService) GetViewStats(isSuperuser bool, dimension string, userID, domainID *uuid.UUID, numDays int) (exmodels.StatsDimensionCounts, error) {
	logger.Debugf("statsService.GetViewStats(%v, %q, %s, %s, %d)", isSuperuser, dimension, userID, domainID, numDays)

	// Return a nil slice unless stats gathering is enabled
	if config.ServerConfig.DisablePageViewStats {
		return nil, nil
	}

	// Calculate the start date
	_, start := getStatsStartDate(numDays)

	// Prepare a query for view counts, grouped by the specified dimension
	q := svc.dbx().From(goqu.T("cm_domain_page_views").As("v")).
		Select(goqu.COUNT("*").As("cnt"), goqu.I(dimension).As("el")).
		// Join the page in question
		Join(goqu.T("cm_domain_pages").As("p"), goqu.On(goqu.Ex{"p.id": goqu.I("v.page_id")})).
		// Filter by domain
		Join(goqu.T("cm_domains").As("d"), goqu.On(goqu.Ex{"d.id": goqu.I("p.domain_id")})).
		// Select only last N days
		Where(goqu.I("v.ts_created").Gte(start)).
		GroupBy(dimension).
		// Sort by count in descending order, and by element - for stable ordering
		Order(goqu.I("cnt").Desc(), goqu.I("el").Asc())

	// Filter by domain, if any
	if domainID != nil {
		q = q.Where(goqu.Ex{"d.id": domainID})
	}

	// If the user isn't a superuser, filter by owned domains
	if !isSuperuser {
		q = addStatsOwnedDomainFilter(q, userID)
	}

	// Query the data
	var res exmodels.StatsDimensionCounts
	if err := q.ScanStructs(&res); err != nil {
		logger.Errorf("statsService.GetViewStats: ScanStructs() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return res, nil
}

// fillCommentCommenterStats fills the statistics for comments and commenters in totals
func (svc *statsService) fillCommentCommenterStats(curUser *data.User, totals *StatsTotals) error {
	// Prepare a query
	q := svc.dbx().From(goqu.T("cm_comments").As("c")).
		Select(
			goqu.COUNT(goqu.I("c.id")).As("cnt_comments"),
			goqu.COUNT(goqu.I("c.user_created").Distinct()).As("cnt_commenters")).
		Join(goqu.T("cm_domain_pages").As("p"), goqu.On(goqu.Ex{"p.id": goqu.I("c.page_id")})).
		// Exclude deleted comments
		Where(goqu.I("c.is_deleted").IsFalse())

	// If the user isn't a superuser, filter by the domains they can moderate
	if !curUser.IsSuperuser {
		q = q.
			Join(
				goqu.T("cm_domains_users").As("du"),
				goqu.On(
					goqu.Ex{"du.domain_id": goqu.I("p.domain_id"), "du.user_id": &curUser.ID},
					goqu.ExOr{"du.is_owner": true, "du.is_moderator": true}))
	}

	// Query the stats
	var r struct {
		CountComments   int64 `db:"cnt_comments"`
		CountCommenters int64 `db:"cnt_commenters"`
	}
	if b, err := q.ScanStruct(&r); err != nil {
		logger.Errorf("statsService.fillCommentCommenterStats: ScanStruct() failed: %v", err)
		return err
	} else if !b {
		return ErrNotFound
	}
	totals.CountComments = r.CountComments
	totals.CountCommenters = r.CountCommenters

	// Succeeded
	return nil
}

// fillDomainPageUserStats fills the statistics for domains, domain pages, and domain users in totals
func (svc *statsService) fillDomainPageUserStats(curUser *data.User, totals *StatsTotals) error {
	// Prepare a query
	q := svc.dbx().From(goqu.T("cm_domains").As("d")).
		Select(
			"cdu.is_owner",
			"cdu.is_moderator",
			"cdu.is_commenter",
			// Select count of domain pages where the current user is a superuser or domain owner/moderator, otherwise
			// select null
			goqu.Case().
				When(
					util.If[any](curUser.IsSuperuser, true, goqu.ExOr{"cdu.is_owner": true, "cdu.is_moderator": true}),
					svc.dbx().From(goqu.T("cm_domain_pages").As("p")).
						Select(goqu.COUNT("*")).
						Where(goqu.Ex{"p.domain_id": goqu.I("d.id")})).
				As("cnt_pages"),
			// Select count of domain users where the current user is a superuser or domain owner, otherwise select null
			goqu.Case().
				When(
					util.If[any](curUser.IsSuperuser, true, goqu.Ex{"cdu.is_owner": true}),
					svc.dbx().From(goqu.T("cm_domains_users").As("du")).
						Select(goqu.COUNT("*")).
						Where(goqu.Ex{"du.domain_id": goqu.I("d.id")})).
				As("cnt_domains"))

	// Join the domain users table. If the current user is a superuser, they may see any domain, so use an outer join
	cduTable := goqu.T("cm_domains_users").As("cdu")
	cduOn := goqu.On(goqu.Ex{"cdu.domain_id": goqu.I("d.id"), "cdu.user_id": &curUser.ID})
	if curUser.IsSuperuser {
		q = q.LeftJoin(cduTable, cduOn)
	} else {
		q = q.Join(cduTable, cduOn)
	}

	// Run the query
	var dbRecs []struct {
		IsOwner      sql.NullBool  `db:"is_owner"`
		IsModerator  sql.NullBool  `db:"is_moderator"`
		IsCommenter  sql.NullBool  `db:"is_commenter"`
		CountPages   sql.NullInt64 `db:"cnt_pages"`
		CountDomains sql.NullInt64 `db:"cnt_domains"`
	}
	if err := q.ScanStructs(&dbRecs); err != nil {
		logger.Errorf("statsService.fillDomainPageUserStats: ScanStructs() failed: %v", err)
		return err
	}

	// Accumulate counts
	for _, r := range dbRecs {
		// Increment the relevant domain role counter
		if r.IsOwner.Valid && r.IsOwner.Bool {
			totals.CountDomainsOwned++
		} else if r.IsModerator.Valid && r.IsModerator.Bool {
			totals.CountDomainsModerated++
		} else if r.IsCommenter.Valid {
			if r.IsCommenter.Bool {
				totals.CountDomainsCommenter++
			} else {
				totals.CountDomainsReadonly++
			}
		}

		// Increment page counter
		if r.CountPages.Valid {
			totals.CountPagesModerated += r.CountPages.Int64
		}

		// Increment domain user counter
		if r.CountDomains.Valid {
			totals.CountDomainUsers += r.CountDomains.Int64
		}
	}

	// Succeeded
	return nil
}

// fillOwnStats fills the statistics for own comments and pages in totals
func (svc *statsService) fillOwnStats(curUser *data.User, totals *StatsTotals) error {
	// Prepare a query
	q := svc.dbx().From(goqu.T("cm_comments").As("c")).
		Select(
			goqu.COUNT("*").As("cnt_comments"),
			goqu.COUNT(goqu.I("c.page_id").Distinct()).As("cnt_pages")).
		// Only include own comments and exclude deleted
		Where(goqu.Ex{"c.user_created": &curUser.ID, "c.is_deleted": false})

	var r struct {
		CountComments int64 `db:"cnt_comments"`
		CountPages    int64 `db:"cnt_pages"`
	}
	if b, err := q.ScanStruct(&r); err != nil {
		logger.Errorf("statsService.fillOwnStats: ScanStruct() failed: %v", err)
		return err
	} else if !b {
		return ErrNotFound
	}
	totals.CountOwnComments = r.CountComments
	totals.CountPagesCommented = r.CountPages

	// Succeeded
	return nil
}

// fillUserStats fills the statistics for users in totals
func (svc *statsService) fillUserStats(totals *StatsTotals) error {
	// Query the user stats
	var dbRecs []struct {
		Banned bool  `db:"banned"`
		Count  int64 `db:"cnt"`
	}
	if err := svc.dbx().From("cm_users").Select("banned", goqu.COUNT("*").As("cnt")).GroupBy("banned").ScanStructs(&dbRecs); err != nil {
		logger.Errorf("statsService.fillUserStats: ScanStructs() failed: %v", err)
		return err
	}

	// Accumulate counts by incrementing the relevant user counters
	for _, r := range dbRecs {
		totals.CountUsersTotal += r.Count
		if r.Banned {
			totals.CountUsersBanned += r.Count
		} else {
			totals.CountUsersNonBanned += r.Count
		}
	}

	// Succeeded
	return nil
}

// queryDailyStats collects and returns a daily statistics using the provided database rows
func (svc *statsService) queryDailyStats(ds *goqu.SelectDataset, start time.Time, num int) ([]uint64, error) {
	// Query the data
	var dbRecs []struct {
		// The date has to be fetched as a string and parsed afterwards due to SQLite3 limitation on type detection when
		// using a function, see https://github.com/mattn/go-sqlite3/issues/951
		Date  string `db:"date"`
		Count uint64 `db:"cnt"`
	}
	if err := ds.ScanStructs(&dbRecs); err != nil {
		logger.Errorf("statsService.queryDailyStats: ScanStructs() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Iterate data rows
	var res []uint64
	for _, r := range dbRecs {
		// Parse the returned string into time
		t, err := time.Parse(time.RFC3339, r.Date)
		if err != nil {
			logger.Errorf("statsService.queryDailyStats: failed to parse datetime string: %v", err)
			return nil, translateDBErrors(err)
		}

		// UTC-ise the time, just in case it's in a different timezone
		t = t.UTC()

		// Fill any gap in the day sequence with zeroes
		for start.Before(t) {
			res = append(res, 0)
			start = start.AddDate(0, 0, 1)
		}

		// Append a "real" data row
		res = append(res, r.Count)
		start = start.AddDate(0, 0, 1)
	}

	// Add missing rows up to the requested number (fill any gap at the end)
	for len(res) < num {
		res = append(res, 0)
	}

	// Succeeded
	return res, nil
}

// addStatsOwnedDomainFilter adds a join condition for domains owned by the given user, to the given query
func addStatsOwnedDomainFilter(q *goqu.SelectDataset, userID *uuid.UUID) *goqu.SelectDataset {
	return q.Join(
		goqu.T("cm_domains_users").As("du"),
		goqu.On(goqu.Ex{"du.domain_id": goqu.I("d.id"), "du.user_id": userID, "du.is_owner": true}))
}

// getStatsStartDate returns a corrected number of stats days and the corresponding start date
func getStatsStartDate(numDays int) (int, time.Time) {
	// Correct the number of days if needed
	if numDays > util.MaxNumberStatsDays {
		numDays = util.MaxNumberStatsDays
	}

	// Start date is today minus (numDays-1)
	return numDays, time.Now().UTC().Truncate(util.OneDay).AddDate(0, 0, -numDays+1)
}

//----------------------------------------------------------------------------------------------------------------------

// StatsTotals groups total statistical figures
type StatsTotals struct {
	CountUsersTotal       int64 // Total number of users the current user can manage (superuser only)
	CountUsersBanned      int64 // Number of banned users the current user can manage (superuser only)
	CountUsersNonBanned   int64 // Number of non-banned users the current user can manage (superuser only)
	CountDomainsOwned     int64 // Number of domains the current user owns
	CountDomainsModerated int64 // Number of domains the current user is a moderator on
	CountDomainsCommenter int64 // Number of domains the current user is a commenter on
	CountDomainsReadonly  int64 // Number of domains the current user has the readonly status on
	CountPagesModerated   int64 // Number of pages the current user can moderate
	CountDomainUsers      int64 // Number of domain users the current user can manage
	CountComments         int64 // Number of comments the current user can moderate
	CountCommenters       int64 // Number of authors of comment the current user can moderate
	CountPagesCommented   int64 // Number of pages the current user commented on
	CountOwnComments      int64 // Number of comments the current user authored
}

// ToDTO converts the object into an API model
func (t *StatsTotals) ToDTO() *models.StatsTotals {
	return &models.StatsTotals{
		CountCommenters:       t.CountCommenters,
		CountComments:         t.CountComments,
		CountDomainUsers:      t.CountDomainUsers,
		CountDomainsCommenter: t.CountDomainsCommenter,
		CountDomainsModerated: t.CountDomainsModerated,
		CountDomainsOwned:     t.CountDomainsOwned,
		CountDomainsReadonly:  t.CountDomainsReadonly,
		CountOwnComments:      t.CountOwnComments,
		CountPagesCommented:   t.CountPagesCommented,
		CountPagesModerated:   t.CountPagesModerated,
		CountUsersBanned:      t.CountUsersBanned,
		CountUsersNonBanned:   t.CountUsersNonBanned,
		CountUsersTotal:       t.CountUsersTotal,
	}
}
