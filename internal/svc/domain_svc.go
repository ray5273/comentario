package svc

import (
	"database/sql"
	"fmt"
	"github.com/doug-martin/goqu/v9"
	_ "github.com/doug-martin/goqu/v9/dialect/postgres"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"sort"
	"strings"
	"time"
)

// TheDomainService is a global DomainService implementation
var TheDomainService DomainService = &domainService{}

// DomainService is a service interface for dealing with domains
type DomainService interface {
	// ClearByID removes all dependent objects (users, pages, comments, votes etc.) for the specified domain by its ID
	ClearByID(id *uuid.UUID) error
	// CountOwned returns the number of domains the specified user owns
	CountOwned(userID *uuid.UUID) (int, error)
	// Create creates and persists a new domain record
	Create(userID *uuid.UUID, domain *data.Domain, idps []models.FederatedIdpID) error
	// DeleteByID removes the domain with all dependent objects (users, pages, comments, votes etc.) for the specified
	// domain by its ID
	DeleteByID(id *uuid.UUID) error
	// FindByHost fetches and returns a domain by its host
	FindByHost(host string) (*data.Domain, error)
	// FindByID fetches and returns a domain by its ID
	FindByID(id *uuid.UUID) (*data.Domain, error)
	// FindDomainUserByHost fetches and returns a Domain and DomainUser by domain host and user ID. If the domain
	// exists, but there's no record for the user on that domain:
	//  - if createIfMissing == true, creates a new domain user and returns it
	//  - if createIfMissing == false, returns nil for DomainUser
	FindDomainUserByHost(host string, userID *uuid.UUID, createIfMissing bool) (*data.Domain, *data.DomainUser, error)
	// FindDomainUserByID fetches and returns a Domain and DomainUser by domain and user IDs. If the domain exists, but
	// there's no record for the user on that domain, returns nil for DomainUser
	FindDomainUserByID(domainID, userID *uuid.UUID) (*data.Domain, *data.DomainUser, error)
	// GenerateSSOSecret (re)generates a new SSO secret token for the given domain and saves that in domain properties
	GenerateSSOSecret(domainID *uuid.UUID) (string, error)
	// IncrementCounts increments (or decrements if the value is negative) the domain's comment/view counts
	IncrementCounts(domainID *uuid.UUID, incComments, incViews int) error
	// ListByDomainUser fetches and returns a list of domains the current user has any rights to, and a list of domain
	// users in relation to the specified user.
	//   - userID is the user to return domain users for.
	//   - curUserID is the current user: only those domain this user is registered for are returned, unless superuser == true.
	//   - If superuser == true, includes all domains, effectively ignoring curUserID.
	//   - If withDomainUserOnly == true, returns only domains a domain user record for userID exists for
	//   - filter is an optional substring to filter the result by.
	//   - sortBy is an optional property name to sort the result by. If empty, sorts by the host.
	//   - dir is the sort direction.
	//   - pageIndex is the page index, if negative, no pagination is applied.
	ListByDomainUser(userID, curUserID *uuid.UUID, superuser, withDomainUserOnly bool, filter, sortBy string, dir data.SortDirection, pageIndex int) ([]*data.Domain, []*data.DomainUser, error)
	// ListDomainFederatedIdPs fetches and returns a list of federated identity providers enabled for the domain with
	// the given ID
	ListDomainFederatedIdPs(domainID *uuid.UUID) ([]models.FederatedIdpID, error)
	// SetReadonly sets the readonly status for the given domain
	SetReadonly(domainID *uuid.UUID, readonly bool) error
	// StatsDaily collects and returns daily comment and views statistics for the given domain and number of days. If
	// domainID is nil, statistics is collected for all domains owned by the user
	StatsDaily(userID, domainID *uuid.UUID, numDays int) (comments, views []uint64, err error)
	// StatsTotalsForUser collects and returns total figures for all domains accessible to the specified user
	StatsTotalsForUser(curUser *data.User) (countDomains, countPages, countComments, countCommenters uint64, err error)
	// Update updates an existing domain record in the database
	Update(domain *data.Domain, idps []models.FederatedIdpID) error
	// UserAdd links the specified user to the given domain
	UserAdd(du *data.DomainUser) error
	// UserModify updates roles and settings of the specified user in the given domain
	UserModify(du *data.DomainUser) error
	// UserRemove unlinks the specified user from the given domain
	UserRemove(userID, domainID *uuid.UUID) error
}

//----------------------------------------------------------------------------------------------------------------------

// domainService is a blueprint DomainService implementation
type domainService struct{}

func (svc *domainService) ClearByID(id *uuid.UUID) error {
	logger.Debugf("domainService.ClearByID(%s)", id)

	if err := db.Exec("delete from cm_domain_pages where domain_id=$1;", id); err != nil {
		logger.Errorf("domainService.ClearByID: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) CountOwned(userID *uuid.UUID) (int, error) {
	logger.Debugf("domainService.CountOwned(%s)", userID)

	// Query the owned domain count
	var i int
	if err := db.QueryRow("select count(*) from cm_domains_users where user_id=$1 and is_owner=true;", userID).Scan(&i); err != nil {
		return 0, translateDBErrors(err)
	} else {
		// Succeeded
		return i, nil
	}

}

func (svc *domainService) Create(userID *uuid.UUID, domain *data.Domain, idps []models.FederatedIdpID) error {
	logger.Debugf("domainService.Create(%s, %#v, %v)", userID, domain, idps)

	// Insert a new domain record
	if err := db.Exec(
		"insert into cm_domains("+
			"id, name, host, ts_created, is_https, is_readonly, auth_anonymous, auth_local, auth_sso, sso_url, "+
			"mod_anonymous, mod_authenticated, mod_num_comments, mod_user_age_days, mod_links, mod_images, "+
			"mod_notify_policy, default_sort) "+
			"values($1, $2, $3, $4, $5, false, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17);",
		&domain.ID, domain.Name, domain.Host, domain.CreatedTime, domain.IsHTTPS, domain.AuthAnonymous,
		domain.AuthLocal, domain.AuthSSO, domain.SSOURL, domain.ModAnonymous, domain.ModAuthenticated,
		domain.ModNumComments, domain.ModUserAgeDays, domain.ModLinks, domain.ModImages, domain.ModNotifyPolicy,
		domain.DefaultSort,
	); err != nil {
		logger.Errorf("domainService.Create: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Save the domain IdPs
	if err := svc.saveIdPs(&domain.ID, idps); err != nil {
		return err
	}

	// Register the user as domain owner
	if err := svc.UserAdd(&data.DomainUser{
		DomainID:        domain.ID,
		UserID:          *userID,
		IsOwner:         true,
		IsModerator:     true,
		IsCommenter:     true,
		NotifyReplies:   true,
		NotifyModerator: true,
		CreatedTime:     time.Now().UTC(),
	}); err != nil {
		return err
	}

	// Succeeded
	return nil
}

func (svc *domainService) DeleteByID(id *uuid.UUID) error {
	logger.Debugf("domainService.DeleteByID(%s)", id)

	err := db.Exec("delete from cm_domains where id=$1;", id)
	if err != nil {
		logger.Errorf("domainService.DeleteByID: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) FindByHost(host string) (*data.Domain, error) {
	logger.Debugf("domainService.FindByHost('%s')", host)

	// Query the row
	row := db.QueryRow(
		"select "+
			"d.id, d.name, d.host, d.ts_created, d.is_https, d.is_readonly, d.auth_anonymous, d.auth_local, "+
			"d.auth_sso, d.sso_url, d.sso_secret, d.mod_anonymous, d.mod_authenticated, d.mod_num_comments, "+
			"d.mod_user_age_days, d.mod_links, d.mod_images, d.mod_notify_policy, d.default_sort, d.count_comments, "+
			"d.count_views "+
			"from cm_domains d "+
			"where d.host=$1;",
		host)

	// Fetch the domain
	if d, err := svc.fetchDomain(row); err != nil {
		return nil, translateDBErrors(err)
	} else {
		// Succeeded
		return d, nil
	}
}

func (svc *domainService) FindByID(id *uuid.UUID) (*data.Domain, error) {
	logger.Debugf("domainService.FindByID(%s)", id)

	// Query the row
	row := db.QueryRow(
		"select "+
			"d.id, d.name, d.host, d.ts_created, d.is_https, d.is_readonly, d.auth_anonymous, d.auth_local, "+
			"d.auth_sso, d.sso_url, d.sso_secret, d.mod_anonymous, d.mod_authenticated, d.mod_num_comments, "+
			"d.mod_user_age_days, d.mod_links, d.mod_images, d.mod_notify_policy, d.default_sort, d.count_comments, "+
			"d.count_views "+
			"from cm_domains d "+
			"where d.id=$1;",
		id)

	// Fetch the domain
	if d, err := svc.fetchDomain(row); err != nil {
		return nil, translateDBErrors(err)
	} else {
		// Succeeded
		return d, nil
	}
}

func (svc *domainService) FindDomainUserByHost(host string, userID *uuid.UUID, createIfMissing bool) (*data.Domain, *data.DomainUser, error) {
	logger.Debugf("domainService.FindDomainUserByHost('%s', %s, %v)", host, userID, createIfMissing)

	// Query the row
	row := db.QueryRow(
		"select "+
			// Domain fields
			"d.id, d.name, d.host, d.ts_created, d.is_https, d.is_readonly, d.auth_anonymous, d.auth_local, "+
			"d.auth_sso, d.sso_url, d.sso_secret, d.mod_anonymous, d.mod_authenticated, d.mod_num_comments, "+
			"d.mod_user_age_days, d.mod_links, d.mod_images, d.mod_notify_policy, d.default_sort, d.count_comments, "+
			"d.count_views, "+
			// Domain user fields
			"du.user_id, du.is_owner, du.is_moderator, du.is_commenter, du.notify_replies, du.notify_moderator, "+
			"du.ts_created "+
			"from cm_domains d "+
			"left join cm_domains_users du on du.domain_id=d.id and du.user_id=$1 "+
			"where d.host=$2;",
		userID, host)

	// Fetch the domain and the domain user
	d, du, err := svc.fetchDomainUser(row)
	if err != nil {
		return nil, nil, translateDBErrors(err)
	}

	// If no domain user found, and we need to create one
	if du == nil && createIfMissing {
		du = &data.DomainUser{
			DomainID:        d.ID,
			UserID:          *userID,
			IsCommenter:     true, // User can comment by default, until made readonly
			NotifyReplies:   true,
			NotifyModerator: true,
			CreatedTime:     time.Now().UTC(),
		}

		if err := svc.UserAdd(du); err != nil {
			return nil, nil, err
		}
	}

	// Succeeded
	return d, du, nil
}

func (svc *domainService) FindDomainUserByID(domainID, userID *uuid.UUID) (*data.Domain, *data.DomainUser, error) {
	logger.Debugf("domainService.FindDomainUserByID(%s, %s)", domainID, userID)

	// Query the row
	row := db.QueryRow(
		"select "+
			// Domain fields
			"d.id, d.name, d.host, d.ts_created, d.is_https, d.is_readonly, d.auth_anonymous, d.auth_local, "+
			"d.auth_sso, d.sso_url, d.sso_secret, d.mod_anonymous, d.mod_authenticated, d.mod_num_comments, "+
			"d.mod_user_age_days, d.mod_links, d.mod_images, d.mod_notify_policy, d.default_sort, d.count_comments, "+
			"d.count_views, "+
			// Domain user fields
			"du.user_id, du.is_owner, du.is_moderator, du.is_commenter, du.notify_replies, du.notify_moderator, "+
			"du.ts_created "+
			"from cm_domains d "+
			"left join cm_domains_users du on du.domain_id=d.id and du.user_id=$1 "+
			"where d.id=$2;",
		userID, domainID)

	// Fetch the domain and the domain user
	if d, du, err := svc.fetchDomainUser(row); err != nil {
		return nil, nil, translateDBErrors(err)
	} else {
		// Succeeded
		return d, du, nil
	}
}

func (svc *domainService) GenerateSSOSecret(domainID *uuid.UUID) (string, error) {
	logger.Debugf("domainService.GenerateSSOSecret(%s)", domainID)

	// Generate a new secret
	d := &data.Domain{ID: *domainID}
	if err := d.SSOSecretNew(); err != nil {
		logger.Errorf("userService.GenerateSSOSecret: domain.SSOSecretNew() failed: %v", err)
		return "", err
	}

	// Update the domain record
	ss := d.SSOSecretStr()
	if err := db.Exec("update cm_domains set sso_secret=$1 where id=$2;", ss, &d.ID); err != nil {
		logger.Errorf("domainService.GenerateSSOSecret: Exec() failed: %v", err)
		return "", translateDBErrors(err)
	}

	// Succeeded
	return ss.String, nil
}

func (svc *domainService) IncrementCounts(domainID *uuid.UUID, incComments, incViews int) error {
	logger.Debugf("domainService.IncrementCounts(%s, %d, %d)", domainID, incComments, incViews)

	// Update the domain record
	if err := db.ExecOne(
		"update cm_domains set count_comments=count_comments+$1, count_views=count_views+$2 where id=$3;",
		incComments, incViews, domainID,
	); err != nil {
		logger.Errorf("domainService.IncrementCounts: ExecOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) ListByDomainUser(userID, curUserID *uuid.UUID, superuser, withDomainUserOnly bool, filter, sortBy string, dir data.SortDirection, pageIndex int) ([]*data.Domain, []*data.DomainUser, error) {
	logger.Debugf("domainService.ListByDomainUser(%s, %s, %v, %v, '%s', '%s', %s, %d)", userID, curUserID, superuser, withDomainUserOnly, filter, sortBy, dir, pageIndex)

	// Prepare a statement
	q := db.Dialect().
		From(goqu.T("cm_domains").As("d")).
		Select(
			// Domain fields
			"d.id", "d.name", "d.host", "d.ts_created", "d.is_https", "d.is_readonly", "d.auth_anonymous",
			"d.auth_local", "d.auth_sso", "d.sso_url", "d.sso_secret", "d.mod_anonymous", "d.mod_authenticated",
			"d.mod_num_comments", "d.mod_user_age_days", "d.mod_links", "d.mod_images", "d.mod_notify_policy",
			"d.default_sort", "d.count_comments", "d.count_views",
			// Domain user fields for userID
			"du.user_id", "du.is_owner", "du.is_moderator", "du.is_commenter", "du.notify_replies",
			"du.notify_moderator", "du.ts_created",
			// Domain user fields for curUserID
			"duc.is_owner")

	// Join domain users for userID. Use an inner join if only domains with a domain user are requested
	duTable := goqu.T("cm_domains_users").As("du")
	duJoinOn := goqu.On(goqu.Ex{"du.domain_id": goqu.I("d.id"), "du.user_id": userID})
	if withDomainUserOnly {
		q = q.Join(duTable, duJoinOn)
	} else {
		q = q.LeftJoin(duTable, duJoinOn)
	}

	// Add filter by domain user for the current user
	ducTable := goqu.T("cm_domains_users").As("duc")
	ducJoinOn := goqu.On(goqu.Ex{"duc.domain_id": goqu.I("d.id"), "duc.user_id": curUserID})
	if superuser {
		// Superuser can see all domains, so a domain user is optional
		q = q.LeftJoin(ducTable, ducJoinOn)

	} else {
		// For regular users, only show domains that the current user is registered for
		q = q.Join(ducTable, ducJoinOn)
	}

	// Add substring filter
	if filter != "" {
		pattern := "%" + strings.ToLower(filter) + "%"
		q = q.Where(goqu.Or(
			goqu.L(`lower("d"."name")`).Like(pattern),
			goqu.L(`lower("d"."host")`).Like(pattern),
		))
	}

	// Configure sorting
	sortIdent := "d.host"
	switch sortBy {
	case "name":
		sortIdent = "d.name"
	case "created":
		sortIdent = "d.ts_created"
	case "countComments":
		sortIdent = "d.count_comments"
	case "countViews":
		sortIdent = "d.count_views"
	}
	q = q.Order(
		dir.ToOrderedExpression(sortIdent),
		goqu.I("d.id").Asc(), // Always add ID for stable ordering
	)

	// Paginate if required
	if pageIndex >= 0 {
		q = q.Limit(util.ResultPageSize).Offset(uint(pageIndex) * util.ResultPageSize)
	}

	// Query domains
	rows, err := db.Select(q)
	if err != nil {
		logger.Errorf("domainService.ListByDomainUser: Query() failed: %v", err)
		return nil, nil, translateDBErrors(err)
	}
	defer rows.Close()

	// Fetch the domains and domain users
	var ds []*data.Domain
	var dus []*data.DomainUser
	var curUserIsOwner sql.NullBool
	for rows.Next() {
		// Fetch the domain, the domain user, and whether the current user is an owner of the domain
		if d, du, err := svc.fetchDomainUser(rows, &curUserIsOwner); err != nil {
			return nil, nil, translateDBErrors(err)
		} else {
			// Accumulate domains, applying the current user's authorisations
			ds = append(ds, d.CloneWithClearance(superuser, curUserIsOwner.Valid && curUserIsOwner.Bool))

			// Accumulate domain users, if there's one
			if du != nil {
				dus = append(dus, du)
			}
		}
	}

	// Verify Next() didn't error
	if err := rows.Err(); err != nil {
		return nil, nil, translateDBErrors(err)
	}

	// Succeeded
	return ds, dus, nil
}

func (svc *domainService) ListDomainFederatedIdPs(domainID *uuid.UUID) ([]models.FederatedIdpID, error) {
	logger.Debugf("domainService.ListDomainFederatedIdPs(%s)", domainID)

	// Query domain's IdPs
	rows, err := db.Query("select fed_idp_id from cm_domains_idps where domain_id=$1;", domainID)
	if err != nil {
		logger.Errorf("domainService.ListDomainFederatedIdPs: Query() failed: %v", err)
		return nil, translateDBErrors(err)
	}
	defer rows.Close()

	// Fetch the IDs
	var res []models.FederatedIdpID
	for rows.Next() {
		var id models.FederatedIdpID
		if err := rows.Scan(&id); err != nil {
			logger.Errorf("domainService.ListDomainFederatedIdPs: rows.Scan() failed: %v", err)
			return nil, err

			// Only add a provider if it's enabled globally
		} else if _, ok, _ := data.GetFederatedIdP(id); ok {
			res = append(res, id)
		}
	}

	// Verify Next() didn't error
	if err := rows.Err(); err != nil {
		logger.Errorf("domainService.ListDomainFederatedIdPs: rows.Next() failed: %v", err)
		return nil, err
	}

	// Sort the providers by ID for a stable ordering
	sort.Slice(res, func(i, j int) bool { return res[i] < res[j] })

	// Succeeded
	return res, nil
}

func (svc *domainService) SetReadonly(domainID *uuid.UUID, readonly bool) error {
	logger.Debugf("domainService.SetReadonly(%s, %v)", domainID, readonly)

	// Update the domain record
	if err := db.ExecOne("update cm_domains set is_readonly=$1 where id=$2;", readonly, domainID); err != nil {
		logger.Errorf("domainService.SetReadonly: ExecOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) StatsDaily(userID, domainID *uuid.UUID, numDays int) (comments, views []uint64, err error) {
	logger.Debugf("domainService.StatsDaily(%s, %s, %d)", userID, domainID, numDays)

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
		logger.Errorf("domainService.StatsDaily: Query() failed for comments: %v", err)
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
		logger.Errorf("domainService.StatsDaily: Query() failed for views: %v", err)
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

func (svc *domainService) StatsTotalsForUser(curUser *data.User) (countDomains, countPages, countComments, countCommenters uint64, err error) {
	logger.Debugf("domainService.StatsTotalsForUser(%s)", &curUser.ID)

	// Query domain and page counts
	qDP := db.Dialect().
		From(goqu.T("cm_domains").As("d")).
		Select(goqu.COUNT(goqu.I("d.id").Distinct()), goqu.COUNT(goqu.I("p.id"))).
		LeftJoin(goqu.T("cm_domain_pages").As("p"), goqu.On(goqu.Ex{"p.domain_id": goqu.I("d.id")}))

	// If the user isn't a superuser, filter by the domains they own
	if !curUser.IsSuperuser {
		qDP = qDP.
			Join(
				goqu.T("cm_domains_users").As("du"),
				goqu.On(goqu.Ex{"du.domain_id": goqu.I("d.id"), "du.user_id": &curUser.ID, "du.is_owner": true}))
	}

	// Run the query
	if err = db.SelectRow(qDP).Scan(&countDomains, &countPages); err != nil {
		logger.Errorf("domainService.StatsTotalsForUser: SelectRow() for domains/pages failed: %v", err)
		return 0, 0, 0, 0, translateDBErrors(err)
	}

	// Query comment and commenter counts
	qCC := db.Dialect().
		From(goqu.T("cm_comments").As("c")).
		Select(goqu.COUNT(goqu.I("c.id")), goqu.COUNT(goqu.I("c.user_created").Distinct())).
		Join(goqu.T("cm_domain_pages").As("p"), goqu.On(goqu.Ex{"p.id": goqu.I("c.page_id")}))

	// If the user isn't a superuser, filter by the domains they own
	if !curUser.IsSuperuser {
		qCC = qCC.
			Join(
				goqu.T("cm_domains_users").As("du"),
				goqu.On(goqu.Ex{"du.domain_id": goqu.I("p.domain_id"), "du.user_id": &curUser.ID, "du.is_owner": true}))
	}

	// Run the query
	if err = db.SelectRow(qCC).Scan(&countComments, &countCommenters); err != nil {
		// Any other database error
		logger.Errorf("domainService.StatsTotalsForUser: SelectRow() for comments/commenters failed: %v", err)
		return 0, 0, 0, 0, translateDBErrors(err)
	}

	// Succeeded
	return
}

func (svc *domainService) Update(domain *data.Domain, idps []models.FederatedIdpID) error {
	logger.Debugf("domainService.Update(%#v, %v)", domain, idps)

	// Update the domain record
	if err := db.ExecOne(
		"update cm_domains "+
			"set name=$1, is_https=$2, auth_anonymous=$3, auth_local=$4, auth_sso=$5, sso_url=$6, mod_anonymous=$7, "+
			"mod_authenticated=$8, mod_num_comments=$9, mod_user_age_days=$10, mod_links=$11, mod_images=$12, "+
			"mod_notify_policy=$13, default_sort=$14 "+
			"where id=$15;",
		domain.Name, domain.IsHTTPS, domain.AuthAnonymous, domain.AuthLocal, domain.AuthSSO, domain.SSOURL,
		domain.ModAnonymous, domain.ModAuthenticated, domain.ModNumComments, domain.ModUserAgeDays, domain.ModLinks,
		domain.ModImages, domain.ModNotifyPolicy, domain.DefaultSort, &domain.ID,
	); err != nil {
		logger.Errorf("domainService.Update: ExecOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Save the domain IdPs
	if err := svc.saveIdPs(&domain.ID, idps); err != nil {
		return err
	}

	// Succeeded
	return nil
}

func (svc *domainService) UserAdd(du *data.DomainUser) error {
	logger.Debugf("domainService.UserAdd(%#v)", du)

	// Don't bother if the user is an anonymous one
	if du.UserID != data.AnonymousUser.ID {
		// Insert a new domain-user link record
		if err := db.Exec(
			"insert into cm_domains_users(domain_id, user_id, is_owner, is_moderator, is_commenter, notify_replies, notify_moderator, ts_created) "+
				"values($1, $2, $3, $4, $5, $6, $7, $8);",
			&du.DomainID, &du.UserID, du.IsOwner, du.IsModerator, du.IsCommenter, du.NotifyReplies, du.NotifyModerator,
			du.CreatedTime,
		); err != nil {
			logger.Errorf("domainService.UserAdd: Exec() failed: %v", err)
			return translateDBErrors(err)
		}
	}

	// Succeeded
	return nil
}

func (svc *domainService) UserModify(du *data.DomainUser) error {
	logger.Debugf("domainService.UserModify(%#v)", du)

	// Don't bother if the user is an anonymous one
	if du.UserID != data.AnonymousUser.ID {
		// Update the domain-user link record
		if err := db.ExecOne(
			"update cm_domains_users set is_owner=$1, is_moderator=$2, is_commenter=$3, notify_replies=$4, notify_moderator=$5 "+
				"where domain_id=$6 and user_id=$7;",
			du.IsOwner, du.IsModerator, du.IsCommenter, du.NotifyReplies, du.NotifyModerator, &du.DomainID, &du.UserID,
		); err != nil {
			logger.Errorf("domainService.UserModify: ExecOne() failed: %v", err)
			return translateDBErrors(err)
		}
	}

	// Succeeded
	return nil
}

func (svc *domainService) UserRemove(userID, domainID *uuid.UUID) error {
	logger.Debugf("domainService.UserRemove(%s, %s)", userID, domainID)

	// Don't bother if the user is an anonymous one
	if *userID != data.AnonymousUser.ID {
		// Delete the domain-user link record
		if err := db.ExecOne("delete from cm_domains_users where domain_id=$1 and user_id=$2;", &domainID, userID); err != nil {
			logger.Errorf("domainService.UserRemove: ExecOne() failed: %v", err)
			return translateDBErrors(err)
		}
	}

	// Succeeded
	return nil
}

// fetchDomain fetches and returns a domain instance from the provided Scanner
func (svc *domainService) fetchDomain(sc util.Scanner) (*data.Domain, error) {
	var d data.Domain
	var ssoSecret sql.NullString
	err := sc.Scan(
		&d.ID,
		&d.Name,
		&d.Host,
		&d.CreatedTime,
		&d.IsHTTPS,
		&d.IsReadonly,
		&d.AuthAnonymous,
		&d.AuthLocal,
		&d.AuthSSO,
		&d.SSOURL,
		&ssoSecret,
		&d.ModAnonymous,
		&d.ModAuthenticated,
		&d.ModNumComments,
		&d.ModUserAgeDays,
		&d.ModLinks,
		&d.ModImages,
		&d.ModNotifyPolicy,
		&d.DefaultSort,
		&d.CountComments,
		&d.CountViews)
	if err != nil {
		logger.Errorf("domainService.fetchDomain: Scan() failed: %v", err)
		return nil, err
	} else if err := d.SetSSOSecretStr(ssoSecret); err != nil {
		logger.Errorf("domainService.fetchDomain: SetSSOSecretStr() failed: %v", err)
		return nil, err
	}

	// Succeeded
	return &d, nil
}

// fetchDomainUser fetches the domain and, optionally, the domain user from the provided Scanner
func (svc *domainService) fetchDomainUser(sc util.Scanner, extraCols ...any) (*data.Domain, *data.DomainUser, error) {
	var d data.Domain
	var ssoSecret sql.NullString
	var duID uuid.NullUUID
	var duIsOwner, duIsModerator, duIsCommenter, duNotifyReplies, duNotifyModerator sql.NullBool
	var duCreatedTime sql.NullTime

	// Prepare result columns
	cols := []any{
		&d.ID,
		&d.Name,
		&d.Host,
		&d.CreatedTime,
		&d.IsHTTPS,
		&d.IsReadonly,
		&d.AuthAnonymous,
		&d.AuthLocal,
		&d.AuthSSO,
		&d.SSOURL,
		&ssoSecret,
		&d.ModAnonymous,
		&d.ModAuthenticated,
		&d.ModNumComments,
		&d.ModUserAgeDays,
		&d.ModLinks,
		&d.ModImages,
		&d.ModNotifyPolicy,
		&d.DefaultSort,
		&d.CountComments,
		&d.CountViews,
		&duID,
		&duIsOwner,
		&duIsModerator,
		&duIsCommenter,
		&duNotifyReplies,
		&duNotifyModerator,
		&duCreatedTime,
	}

	// Add extra columns, if any
	cols = append(cols, extraCols...)

	// Fetch the data
	if err := sc.Scan(cols...); err != nil {
		logger.Errorf("domainService.fetchDomainUser: Scan() failed: %v", err)
		return nil, nil, err
	} else if err := d.SetSSOSecretStr(ssoSecret); err != nil {
		logger.Errorf("domainService.fetchDomainUser: SetSSOSecretStr() failed: %v", err)
		return nil, nil, err
	}

	// If there's a DomainUser
	var pdu *data.DomainUser
	if duID.Valid {
		pdu = &data.DomainUser{
			DomainID:        d.ID,
			UserID:          duID.UUID,
			IsOwner:         duIsOwner.Bool,
			IsModerator:     duIsModerator.Bool,
			IsCommenter:     duIsCommenter.Bool,
			NotifyReplies:   duNotifyReplies.Bool,
			NotifyModerator: duNotifyModerator.Bool,
			CreatedTime:     duCreatedTime.Time,
		}
	}

	// Succeeded
	return &d, pdu, nil
}

// fetchStats collects and returns a daily statistics using the provided database rows
func (svc *domainService) fetchStats(rs *sql.Rows, start time.Time, num int) ([]uint64, error) {
	// Iterate data rows
	var res []uint64
	for rs.Next() {
		// Fetch a count and a time
		var i uint64
		var t time.Time
		if err := rs.Scan(&i, &t); err != nil {
			logger.Errorf("domainService.fetchStats: rs.Scan() failed: %v", err)
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

// saveIdPs saves domain's identity provider links
func (svc *domainService) saveIdPs(domainID *uuid.UUID, idps []models.FederatedIdpID) error {
	// Delete any existing links
	if err := db.Exec("delete from cm_domains_idps where domain_id=$1", domainID); err != nil {
		logger.Errorf("domainService.saveIdPs: Exec() failed for deleting links: %v", err)
		return translateDBErrors(err)
	}

	// Insert domain IdP records, if any
	if len(idps) > 0 {
		// Prepare an insert statement
		var s strings.Builder
		s.WriteString("insert into cm_domains_idps(domain_id, fed_idp_id) values")

		// Add IdPs to the statement and params
		var params []any
		for i, id := range idps {
			if i > 0 {
				s.WriteByte(',')
			}
			s.WriteString(fmt.Sprintf("($%d,$%d)", i*2+1, i*2+2))
			params = append(params, &domainID, id)
		}
		s.WriteByte(';')

		// Execute the statement
		if err := db.Exec(s.String(), params...); err != nil {
			logger.Errorf("domainService.saveIdPs: Exec() failed for inserting links: %v", err)
			return translateDBErrors(err)
		}
	}

	// Succeeded
	return nil

}
