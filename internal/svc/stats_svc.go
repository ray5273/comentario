package svc

import (
	"database/sql"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"time"
)

// TheStatsService is a global StatsService implementation
var TheStatsService StatsService = &statsService{}

// StatsService is a service interface for dealing with stats
type StatsService interface {
	// GetDailyStats collects and returns daily comment and views statistics for the given domain and number of days. If
	// domainID is nil, statistics is collected for all domains owned by the user
	GetDailyStats(userID, domainID *uuid.UUID, numDays int) (comments, views []uint64, err error)
	// GetTotals collects and returns total figures for all domains accessible to the specified user
	GetTotals(curUser *data.User) (*StatsTotals, error)
}

//----------------------------------------------------------------------------------------------------------------------

// statsService is a blueprint StatsService implementation
type statsService struct{}

func (svc *statsService) GetDailyStats(userID, domainID *uuid.UUID, numDays int) (comments, views []uint64, err error) {
	logger.Debugf("statsService.GetDailyStats(%s, %s, %d)", userID, domainID, numDays)

	// Correct the number of days if needed
	if numDays > util.MaxNumberStatsDays {
		numDays = util.MaxNumberStatsDays
	}

	// Prepare params
	start := time.Now().UTC().Truncate(util.OneDay).AddDate(0, 0, -numDays+1)
	params := []any{userID, start}

	// Prepare a filter
	domainFilter := ""
	if domainID != nil {
		domainFilter = "and d.id=$3 "
		params = append(params, domainID)
	}

	// Query comment data from the database, grouped by day
	var cRows *sql.Rows
	cRows, err = db.Query(
		"select count(*), date_trunc('day', c.ts_created) "+
			"from cm_comments c "+
			"join cm_domain_pages p on p.id=c.page_id "+
			// Filter by domain
			"join cm_domains d on d.id=p.domain_id "+domainFilter+
			// Filter by owner user
			"join cm_domains_users du on du.domain_id=d.id and du.user_id=$1 and is_owner=true "+
			// Select only last N days
			"where c.ts_created>=$2 "+
			"group by date_trunc('day', c.ts_created) "+
			"order by date_trunc('day', c.ts_created);",
		params...)
	if err != nil {
		logger.Errorf("statsService.GetDailyStats: Query() failed for comments: %v", err)
		return nil, nil, translateDBErrors(err)
	}
	defer cRows.Close()

	// Collect the data
	if comments, err = svc.fetchStats(cRows, start, numDays); err != nil {
		return nil, nil, translateDBErrors(err)
	}

	// Query view data from the database, grouped by day
	var vRows *sql.Rows
	vRows, err = db.Query(
		"select count(*), date_trunc('day', v.ts_created) "+
			"from cm_domain_page_views v "+
			"join cm_domain_pages p on p.id=v.page_id "+
			// Filter by domain
			"join cm_domains d on d.id=p.domain_id "+domainFilter+
			// Filter by owner user
			"join cm_domains_users du on du.domain_id=d.id and du.user_id=$1 and is_owner=true "+
			// Select only last N days
			"where v.ts_created>=$2 "+
			"group by date_trunc('day', v.ts_created) "+
			"order by date_trunc('day', v.ts_created);",
		params...)
	if err != nil {
		logger.Errorf("statsService.GetDailyStats: Query() failed for views: %v", err)
		return nil, nil, translateDBErrors(err)
	}
	defer vRows.Close()

	// Collect the data
	if views, err = svc.fetchStats(vRows, start, numDays); err != nil {
		return nil, nil, translateDBErrors(err)
	}

	// Succeeded
	return
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

	// Succeeded
	return totals, nil
}

// fetchStats collects and returns a daily statistics using the provided database rows
func (svc *statsService) fetchStats(rs *sql.Rows, start time.Time, num int) ([]uint64, error) {
	// Iterate data rows
	var res []uint64
	for rs.Next() {
		// Fetch a count and a time
		var i uint64
		var t time.Time
		if err := rs.Scan(&i, &t); err != nil {
			logger.Errorf("statsService.fetchStats: rs.Scan() failed: %v", err)
			return nil, err
		}

		// UTC-ise the time, just in case it's in a different timezone
		t = t.UTC()

		// Fill any gap in the day sequence with zeroes
		for start.Before(t) {
			res = append(res, 0)
			start = start.AddDate(0, 0, 1)
		}

		// Append a "real" data row
		res = append(res, i)
		start = start.AddDate(0, 0, 1)
	}

	// Check that Next() didn't error
	if err := rs.Err(); err != nil {
		return nil, err
	}

	// Add missing rows up to the requested number (fill any gap at the end)
	for len(res) < num {
		res = append(res, 0)
	}

	// Succeeded
	return res, nil
}

// fillCommentCommenterStats fills the statistics for comments and commenters in totals
func (svc *statsService) fillCommentCommenterStats(curUser *data.User, totals *StatsTotals) error {
	// Prepare a query
	q := db.Dialect().
		From(goqu.T("cm_comments").As("c")).
		Select(goqu.COUNT(goqu.I("c.id")), goqu.COUNT(goqu.I("c.user_created").Distinct())).
		Join(goqu.T("cm_domain_pages").As("p"), goqu.On(goqu.Ex{"p.id": goqu.I("c.page_id")}))

	// If the user isn't a superuser, filter by the domains they can moderate
	if !curUser.IsSuperuser {
		q = q.
			Join(
				goqu.T("cm_domains_users").As("du"),
				goqu.On(
					goqu.Ex{"du.domain_id": goqu.I("p.domain_id"), "du.user_id": &curUser.ID},
					goqu.ExOr{"du.is_owner": true, "du.is_moderator": true}))
	}

	// Run the query
	if err := db.SelectRow(q).Scan(&totals.CountComments, &totals.CountCommenters); err != nil {
		logger.Errorf("statsService.fillCommentCommenterStats: SelectRow() failed: %v", err)
		return err
	}

	// Succeeded
	return nil
}

// fillDomainPageUserStats fills the statistics for domains, domain pages, and domain users in totals
func (svc *statsService) fillDomainPageUserStats(curUser *data.User, totals *StatsTotals) error {
	// Prepare a query
	q := db.Dialect().
		From(goqu.T("cm_domains").As("d")).
		Select(
			"cdu.is_owner",
			"cdu.is_moderator",
			"cdu.is_commenter",
			// Select count of domain pages where the current user is a superuser or domain owner/moderator, otherwise
			// select null
			goqu.Case().
				When(
					util.If[any](curUser.IsSuperuser, true, goqu.ExOr{"cdu.is_owner": true, "cdu.is_moderator": true}),
					db.Dialect().
						From(goqu.T("cm_domain_pages").As("p")).
						Select(goqu.COUNT("*")).
						Where(goqu.Ex{"p.domain_id": goqu.I("d.id")})),
			// Select count of domain users where the current user is a superuser or domain owner, otherwise select null
			goqu.Case().
				When(
					util.If[any](curUser.IsSuperuser, true, goqu.Ex{"cdu.is_owner": true}),
					db.Dialect().
						From(goqu.T("cm_domains_users").As("du")).
						Select(goqu.COUNT("*")).
						Where(goqu.Ex{"du.domain_id": goqu.I("d.id")})))

	// Join the domain users table. If the current user is a superuser, they may see any domain, so use an outer join
	cduTable := goqu.T("cm_domains_users").As("cdu")
	cduOn := goqu.On(goqu.Ex{"cdu.domain_id": goqu.I("d.id"), "cdu.user_id": &curUser.ID})
	if curUser.IsSuperuser {
		q = q.LeftJoin(cduTable, cduOn)
	} else {
		q = q.Join(cduTable, cduOn)
	}

	// Run the query
	rows, err := db.Select(q)
	if err != nil {
		logger.Errorf("statsService.fillDomainPageUserStats: Select() failed: %v", err)
		return err
	}
	defer rows.Close()

	// Accumulate counts
	for rows.Next() {
		var isOwner, isModerator, isCommenter sql.NullBool
		var cntPages, cntDomainUsers sql.NullInt64
		if err := rows.Scan(&isOwner, &isModerator, &isCommenter, &cntPages, &cntDomainUsers); err != nil {
			logger.Errorf("statsService.fillDomainPageUserStats: Scan() failed: %v", err)
			return err
		}

		// Increment the relevant domain role counter
		if isOwner.Valid && isOwner.Bool {
			totals.CountDomainsOwned++
		} else if isModerator.Valid && isModerator.Bool {
			totals.CountDomainsModerated++
		} else if isCommenter.Valid {
			if isCommenter.Bool {
				totals.CountDomainsCommenter++
			} else {
				totals.CountDomainsReadonly++
			}
		}

		// Increment page counter
		if cntPages.Valid {
			totals.CountPagesModerated += cntPages.Int64
		}

		// Increment domain user counter
		if cntDomainUsers.Valid {
			totals.CountDomainUsers += cntDomainUsers.Int64
		}
	}

	// Verify Next() didn't error
	if err := rows.Err(); err != nil {
		logger.Errorf("statsService.fillDomainPageUserStats: Next() failed: %v", err)
		return err
	}

	// Succeeded
	return nil
}

// fillUserStats fills the statistics for users in totals
func (svc *statsService) fillUserStats(totals *StatsTotals) error {
	rows, err := db.Select(db.Dialect().From(goqu.T("cm_users")).Select("banned", goqu.COUNT("*")).GroupBy("banned"))
	if err != nil {
		logger.Errorf("statsService.fillUserStats: Select() failed: %v", err)
		return err
	}
	defer rows.Close()

	// Accumulate counts
	for rows.Next() {
		var banned bool
		var cnt int64
		if err := rows.Scan(&banned, &cnt); err != nil {
			logger.Errorf("statsService.fillUserStats: Scan() failed: %v", err)
			return err
		}

		// Increment the relevant user counters
		totals.CountUsersTotal += cnt
		if banned {
			totals.CountUsersBanned += cnt
		} else {
			totals.CountUsersNonBanned += cnt
		}
	}

	// Verify Next() didn't error
	if err := rows.Err(); err != nil {
		logger.Errorf("statsService.fillUserStats: Next() failed: %v", err)
		return err
	}

	// Succeeded
	return nil
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
		CountPagesModerated:   t.CountPagesModerated,
		CountUsersBanned:      t.CountUsersBanned,
		CountUsersNonBanned:   t.CountUsersNonBanned,
		CountUsersTotal:       t.CountUsersTotal,
	}
}
