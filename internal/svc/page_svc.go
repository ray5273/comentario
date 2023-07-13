package svc

import (
	"database/sql"
	"github.com/avct/uasurfer"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// ThePageService is a global PageService implementation
var ThePageService PageService = &pageService{}

// PageService is a service interface for dealing with pages
type PageService interface {
	// CommentCounts returns a map of comment counts by page path, for the specified host and multiple paths
	CommentCounts(domainID *uuid.UUID, paths []string) (map[string]int, error)
	// FindByDomainPath finds and returns a page for the specified domain ID and path combination
	FindByDomainPath(domainID *uuid.UUID, path string) (*data.DomainPage, error)
	// FindByID finds and returns a page by its ID
	FindByID(id *uuid.UUID) (*data.DomainPage, error)
	// GetRegisteringView queries a page, registering a new pageview, inserting a new page database record if necessary
	GetRegisteringView(domain *data.Domain, path string, req *http.Request) (*data.DomainPage, error)
	// IncrementCounts increments (or decrements if the value is negative) the page's comment/view counts
	IncrementCounts(pageID *uuid.UUID, incComments, incViews int) error
	// ListByDomainUser fetches and returns a list of domain pages the specified user has rights to in a specific
	// domain.
	//   - domainID is the domain ID to filter the pages by. If nil, returns pages for all domains.
	//   - If superuser == true, includes all domain pages.
	//   - filter is an optional substring to filter the result by.
	//   - sortBy is an optional property name to sort the result by. If empty, sorts by the path.
	//   - dir is the sort direction.
	//   - pageIndex is the page index, if negative, no pagination is applied.
	ListByDomainUser(userID, domainID *uuid.UUID, superuser bool, filter, sortBy string, dir data.SortDirection, pageIndex int) ([]*data.DomainPage, error)
	// Update updates the page by its ID
	Update(page *data.DomainPage) error
}

//----------------------------------------------------------------------------------------------------------------------

// pageService is a blueprint PageService implementation
type pageService struct{}

func (svc *pageService) CommentCounts(domainID *uuid.UUID, paths []string) (map[string]int, error) {
	logger.Debugf("pageService.CommentCounts(%s, [%d items])", domainID, len(paths))

	// Query paths/comment counts
	rows, err := db.Query(
		"select path, count_comments from cm_domain_pages where domain_id=$1 and path=any($2);",
		domainID, pq.Array(paths))
	if err != nil {
		logger.Errorf("pageService.CommentCounts: Query() failed: %v", err)
		return nil, translateDBErrors(err)
	}
	defer rows.Close()

	// Fetch the paths and count, converting them into a map
	res := make(map[string]int)
	for rows.Next() {
		var p string
		var c int
		if err = rows.Scan(&p, &c); err != nil {
			logger.Errorf("pageService.CommentCounts: rows.Scan() failed: %v", err)
			return nil, translateDBErrors(err)
		}
		res[p] = c
	}

	// Check that Next() didn't error
	if err := rows.Err(); err != nil {
		logger.Errorf("pageService.CommentCounts: rows.Next() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return nil, nil
}

func (svc *pageService) GetRegisteringView(domain *data.Domain, path string, req *http.Request) (*data.DomainPage, error) {
	logger.Debugf("pageService.GetRegisteringView(%#v, '%s', ...)", domain, path)

	// Prepare a new UUID
	id := uuid.New()

	// Query a page row
	row := db.QueryRow(
		"insert into cm_domain_pages as p(id, domain_id, path, title, is_readonly, ts_created, count_comments, count_views) "+
			"values($1, $2, $3, '', false, $4, 0, 1) "+
			"on conflict (domain_id, path) do update set count_views=p.count_views+1 "+
			"returning id, domain_id, path, title, is_readonly, ts_created, count_comments, count_views;",
		&id, &domain.ID, path, time.Now().UTC())

	// Fetch the row
	var p data.DomainPage
	if err := row.Scan(&p.ID, &p.DomainID, &p.Path, &p.Title, &p.IsReadonly, &p.CreatedTime, &p.CountComments, &p.CountViews); err != nil {
		logger.Errorf("pageService.GetRegisteringView: Scan() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// If the page was added, fetch its title in the background
	if p.ID == id {
		logger.Debug("pageService.GetRegisteringView: page didn't exist, created a new one with ID=%s", &id)
		go func() {
			if err := svc.fetchUpdatePageTitle(domain.Host, p.Path, &p.ID); err != nil {
				logger.Errorf("pageService.GetRegisteringView: fetchUpdatePageTitle() failed: %v", err)
			}
		}()
	}

	// Also register visit details in the background
	go func() {
		if err := svc.insertPageView(&p, req); err != nil {
			logger.Errorf("pageService.GetRegisteringView: insertPageView() failed: %v", err)
		}
	}()

	// Succeeded
	return &p, nil
}

func (svc *pageService) IncrementCounts(pageID *uuid.UUID, incComments, incViews int) error {
	logger.Debugf("pageService.IncrementCounts(%s, %d, %d)", pageID, incComments, incViews)

	// Update the page record
	if err := db.ExecOne(
		"update cm_domain_pages set count_comments=count_comments+$1, count_views=count_views+$2 where id=$3;",
		incComments, incViews, pageID,
	); err != nil {
		logger.Errorf("pageService.IncrementCounts: ExecOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *pageService) FindByDomainPath(domainID *uuid.UUID, path string) (*data.DomainPage, error) {
	logger.Debugf("pageService.FindByDomainPath(%s, '%s')", domainID, path)

	// Query a page row
	var p data.DomainPage
	if err := db.QueryRow(
		"select id, domain_id, path, title, is_readonly, ts_created, count_comments, count_views from cm_domain_pages "+
			"where domain_id=$1 and path=$2;",
		domainID, path,
	).Scan(
		&p.ID, &p.DomainID, &p.Path, &p.Title, &p.IsReadonly, &p.CreatedTime, &p.CountComments, &p.CountViews,
	); err != nil {
		logger.Errorf("pageService.FindByDomainPath: Scan() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return &p, nil
}

func (svc *pageService) FindByID(id *uuid.UUID) (*data.DomainPage, error) {
	logger.Debugf("pageService.FindByID(%s)", id)

	// Query a page row
	var p data.DomainPage
	if err := db.QueryRow(
		"select id, domain_id, path, title, is_readonly, ts_created, count_comments, count_views from cm_domain_pages where id=$1;",
		id,
	).Scan(
		&p.ID, &p.DomainID, &p.Path, &p.Title, &p.IsReadonly, &p.CreatedTime, &p.CountComments, &p.CountViews,
	); err != nil {
		logger.Errorf("pageService.FindByID: Scan() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return &p, nil
}

func (svc *pageService) ListByDomainUser(userID, domainID *uuid.UUID, superuser bool, filter, sortBy string, dir data.SortDirection, pageIndex int) ([]*data.DomainPage, error) {
	logger.Debugf("pageService.ListByDomainUser(%s, %s, %v, '%s', '%s', %s, %d)", userID, domainID, superuser, filter, sortBy, dir, pageIndex)

	// Prepare a statement
	q := db.Dialect().
		From(goqu.T("cm_domain_pages").As("p")).
		Select(
			"p.id", "p.domain_id", "p.path", "p.title", "p.is_readonly", "p.ts_created", "p.count_comments",
			"p.count_views").
		Join(goqu.T("cm_domains").As("d"), goqu.On(goqu.Ex{"d.id": goqu.I("p.domain_id")})).
		Where(goqu.Ex{"d.id": domainID})

	// Add filter by domain user unless it's a superuser
	if superuser {
		q = q.SelectAppend(goqu.L("true"))
	} else {
		// For regular users, only those pages are visible that the user has a domain record for
		q = q.
			SelectAppend("du.is_owner").
			Join(
				goqu.T("cm_domains_users").As("du"),
				goqu.On(goqu.Ex{"du.domain_id": goqu.I("d.id")}),
			).
			Where(
				goqu.Ex{"du.user_id": userID},
				// For non-owner, non-moderator users, only show pages the user commented on
				goqu.Or(
					goqu.Ex{"du.is_owner": true},
					goqu.Ex{"du.is_moderator": true},
					goqu.L("exists (select from cm_comments where page_id=p.id)"),
				))
	}

	// Add substring filter
	if filter != "" {
		pattern := "%" + strings.ToLower(filter) + "%"
		q = q.Where(goqu.Or(
			goqu.L(`lower("p"."path")`).Like(pattern),
			goqu.L(`lower("p"."title")`).Like(pattern),
		))
	}

	// Configure sorting
	sortIdent := "p.path"
	switch sortBy {
	case "title":
		sortIdent = "p.title"
	case "created":
		sortIdent = "p.ts_created"
	case "countComments":
		sortIdent = "p.count_comments"
	case "countViews":
		sortIdent = "p.count_views"
	}
	q = q.Order(
		dir.ToOrderedExpression(sortIdent),
		goqu.I("p.id").Asc(), // Always add ID for stable ordering
	)

	// Paginate if required
	if pageIndex >= 0 {
		q = q.Limit(util.ResultPageSize).Offset(uint(pageIndex) * util.ResultPageSize)
	}

	// Query pages
	rows, err := db.Select(q)
	if err != nil {
		logger.Errorf("pageService.ListByDomainUser: Query() failed: %v", err)
		return nil, translateDBErrors(err)
	}
	defer rows.Close()

	// Fetch the pages
	var ps []*data.DomainPage
	var isOwner sql.NullBool
	for rows.Next() {
		var p data.DomainPage
		if err := rows.Scan(&p.ID, &p.DomainID, &p.Path, &p.Title, &p.IsReadonly, &p.CreatedTime, &p.CountComments, &p.CountViews, &isOwner); err != nil {
			logger.Errorf("pageService.ListByDomainUser: Scan() failed: %v", err)
			return nil, translateDBErrors(err)
		}

		// Determine which page fields the user is allowed to see
		if !superuser && (!isOwner.Valid || !isOwner.Bool) {
			// Non-owner users are only allowed to see a limited subset of fields
			p = *p.AsNonOwner()
		}
		ps = append(ps, &p)
	}

	// Verify Next() didn't error
	if err := rows.Err(); err != nil {
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return ps, nil
}

func (svc *pageService) Update(page *data.DomainPage) error {
	logger.Debugf("pageService.Update(%#v)", page)

	// Update the page record
	if err := db.ExecOne(
		"update cm_domain_pages set title=$1,is_readonly=$2 where id=$3",
		page.Title, page.IsReadonly, &page.ID,
	); err != nil {
		logger.Errorf("pageService.Update: ExecOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

// fetchUpdatePageTitle fetches and updates the title of the provided page based on its URL
func (svc *pageService) fetchUpdatePageTitle(host, path string, pageID *uuid.UUID) error {
	logger.Debugf("pageService.fetchUpdatePageTitle('%s', '%s')", host, path)

	var title string
	var err error

	// Try to fetch the title using HTTPS
	u := &url.URL{Scheme: "https", Host: host, Path: path}
	if title, err = util.HTMLTitleFromURL(u); err != nil {
		// If failed, retry using HTTP
		if err != nil {
			u.Scheme = "http"
			if title, err = util.HTMLTitleFromURL(u); err != nil {
				// If still failed, just use the URL as the title
				if err != nil {
					title = u.String()
				}
			}
		}
	}

	// Make sure the title doesn't exceed the size of the database field
	if len(title) > data.MaxPageTitleLength {
		title = title[:data.MaxPageTitleLength]
	}

	// Update the page in the database
	return db.ExecOne("update cm_domain_pages set title=$1 where id=$2", title, pageID)
}

// insertPageView registers a new page visit in the database
func (svc *pageService) insertPageView(page *data.DomainPage, req *http.Request) error {
	logger.Debugf("pageService.insertPageView(%#v, ...)", page)

	// Extract the remote IP and country
	ip, country := util.UserIPCountry(req)

	// Parse the User Agent header
	ua := uasurfer.Parse(util.UserAgent(req))

	return db.Exec(
		"insert into cm_domain_page_views(page_id, ts_created, proto, ip, country, ua_browser_name, ua_browser_version, ua_os_name, ua_os_version, ua_device) "+
			"values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
		&page.ID, time.Now().UTC(), req.Proto, ip, country, ua.Browser.Name.StringTrimPrefix(),
		util.FormatVersion(&ua.Browser.Version), ua.OS.Name.StringTrimPrefix(), util.FormatVersion(&ua.OS.Version),
		ua.DeviceType.StringTrimPrefix())
}
