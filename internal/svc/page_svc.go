package svc

import (
	"database/sql"
	"github.com/avct/uasurfer"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/config"
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
	// FetchUpdatePageTitle fetches and updates the title of the provided page based on its URL, returning if there was
	// any change
	FetchUpdatePageTitle(domain *data.Domain, page *data.DomainPage) (bool, error)
	// FindByDomainPath finds and returns a page for the specified domain ID and path combination
	FindByDomainPath(domainID *uuid.UUID, path string) (*data.DomainPage, error)
	// FindByID finds and returns a page by its ID
	FindByID(id *uuid.UUID) (*data.DomainPage, error)
	// IncrementCounts increments (or decrements if the value is negative) the page's comment/view counts
	IncrementCounts(pageID *uuid.UUID, incComments, incViews int) error
	// ListByDomain fetches and returns a list of all pages in the specified domain.
	ListByDomain(domainID *uuid.UUID) ([]*data.DomainPage, error)
	// ListByDomainUser fetches and returns a list of domain pages the specified user has rights to in a specific
	// domain.
	//   - domainID is the domain ID to filter the pages by. If nil, returns pages for all domains.
	//   - If superuser == true, includes all domain pages.
	//   - filter is an optional substring to filter the result by.
	//   - sortBy is an optional property name to sort the result by. If empty, sorts by the path.
	//   - dir is the sort direction.
	//   - pageIndex is the page index, if negative, no pagination is applied.
	ListByDomainUser(userID, domainID *uuid.UUID, superuser bool, filter, sortBy string, dir data.SortDirection, pageIndex int) ([]*data.DomainPage, error)
	// UpdateReadonly updates the page's readonly status by its ID
	UpdateReadonly(page *data.DomainPage) error
	// UpsertByDomainPath queries a page, inserting a new page database record if necessary, optionally registering a
	// new pageview (if req is not nil), returning whether the page was added. title is an optional page title, if not
	// provided, it will be fetched from the URL in the background
	UpsertByDomainPath(domain *data.Domain, path, title string, req *http.Request) (*data.DomainPage, bool, error)
}

//----------------------------------------------------------------------------------------------------------------------

// pageService is a blueprint PageService implementation
type pageService struct{}

func (svc *pageService) CommentCounts(domainID *uuid.UUID, paths []string) (map[string]int, error) {
	logger.Debugf("pageService.CommentCounts(%s, [%d items])", domainID, len(paths))

	// Query paths/comment counts
	var dbRecs []struct {
		Path  string `db:"path"`
		Count int    `db:"count_comments"`
	}
	if err := db.From("cm_domain_pages").Where(goqu.Ex{"domain_id": domainID}, goqu.I("path").In(paths)).ScanStructs(&dbRecs); err != nil {
		logger.Errorf("pageService.CommentCounts: ScanStructs() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Convert the slice into a map
	res := map[string]int{}
	for _, r := range dbRecs {
		res[r.Path] = r.Count
	}

	// Succeeded
	return res, nil
}

func (svc *pageService) FetchUpdatePageTitle(domain *data.Domain, page *data.DomainPage) (bool, error) {
	logger.Debugf("pageService.FetchUpdatePageTitle([%s], %v)", &domain.ID, page)

	// Compose the page's URL. Since the path may contain query params, try to split it into a path and a query
	pq := strings.SplitN(page.Path, "?", 2)
	u := &url.URL{Scheme: domain.Scheme(), Host: domain.Host, Path: pq[0]}
	if len(pq) > 1 {
		u.RawQuery = pq[1]
	}

	// Try to fetch the title
	var title string
	var err error
	if title, err = util.HTMLTitleFromURL(u); err != nil {
		// Failed, just use the URL as the title
		title = u.String()
	}

	// Make sure the title doesn't exceed the size of the database field
	title = util.TruncateStr(title, data.MaxPageTitleLength)

	// Check if there's a change needed
	if page.Title == title {
		return false, nil
	}

	// Update the page in the database
	if err := db.ExecuteOne(
		db.Dialect().
			Update("cm_domain_pages").
			Set(goqu.Record{"title": title}).
			Where(goqu.Ex{"id": &page.ID}),
	); err != nil {
		logger.Errorf("pageService.FetchUpdatePageTitle(): ExecuteOne() failed: %v", err)
		return false, err
	}

	// Succeeded
	return true, nil
}

func (svc *pageService) FindByDomainPath(domainID *uuid.UUID, path string) (*data.DomainPage, error) {
	logger.Debugf("pageService.FindByDomainPath(%s, '%s')", domainID, path)

	// Query a page row
	var p data.DomainPage
	if err := db.SelectRow(
		db.Dialect().
			From("cm_domain_pages").
			Select("id", "domain_id", "path", "title", "is_readonly", "ts_created", "count_comments", "count_views").
			Where(goqu.Ex{"domain_id": domainID, "path": path}),
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
	if err := db.SelectRow(
		db.Dialect().
			From("cm_domain_pages").
			Select("id", "domain_id", "path", "title", "is_readonly", "ts_created", "count_comments", "count_views").
			Where(goqu.Ex{"id": id}),
	).Scan(
		&p.ID, &p.DomainID, &p.Path, &p.Title, &p.IsReadonly, &p.CreatedTime, &p.CountComments, &p.CountViews,
	); err != nil {
		logger.Errorf("pageService.FindByID: Scan() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return &p, nil
}

func (svc *pageService) IncrementCounts(pageID *uuid.UUID, incComments, incViews int) error {
	logger.Debugf("pageService.IncrementCounts(%s, %d, %d)", pageID, incComments, incViews)

	// Update the page record
	if err := db.ExecuteOne(
		db.Dialect().
			Update("cm_domain_pages").
			Set(goqu.Record{
				"count_comments": goqu.L("? + ?", goqu.I("count_comments"), incComments),
				"count_views":    goqu.L("? + ?", goqu.I("count_views"), incViews),
			}).
			Where(goqu.Ex{"id": pageID}),
	); err != nil {
		logger.Errorf("pageService.IncrementCounts: ExecuteOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *pageService) ListByDomain(domainID *uuid.UUID) ([]*data.DomainPage, error) {
	logger.Debugf("pageService.ListByDomain(%s)", domainID)

	var ps []*data.DomainPage
	if err := db.From("cm_domain_pages").Where(goqu.Ex{"domain_id": domainID}).ScanStructs(&ps); err != nil {
		logger.Errorf("pageService.ListByDomain: ScanStructs() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return ps, nil
}

func (svc *pageService) ListByDomainUser(userID, domainID *uuid.UUID, superuser bool, filter, sortBy string, dir data.SortDirection, pageIndex int) ([]*data.DomainPage, error) {
	logger.Debugf("pageService.ListByDomainUser(%s, %s, %v, '%s', '%s', %s, %d)", userID, domainID, superuser, filter, sortBy, dir, pageIndex)

	// Prepare a statement
	q := db.From(goqu.T("cm_domain_pages").As("p")).
		Select("p.*").
		Join(goqu.T("cm_domains").As("d"), goqu.On(goqu.Ex{"d.id": goqu.I("p.domain_id")})).
		Where(goqu.Ex{"d.id": domainID})

	// Add filter by domain user unless it's a superuser
	if superuser {
		q = q.SelectAppend(goqu.L("null").As("is_owner"))
	} else {
		// For regular users, only those pages are visible that the user has a domain record for
		q = q.
			SelectAppend(goqu.I("du.is_owner")).
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
					goqu.L(
						// Work around extra parens not understood by SQLite: https://github.com/doug-martin/goqu/issues/204
						"exists ?",
						db.Dialect().
							From(goqu.T("cm_comments").As("c")).
							Where(goqu.Ex{"c.page_id": goqu.I("p.id"), "c.user_created": userID})),
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
	var dbRecs []struct {
		data.DomainPage
		IsOwner sql.NullBool `db:"is_owner"`
	}
	if err := q.ScanStructs(&dbRecs); err != nil {
		logger.Errorf("pageService.ListByDomainUser: ScanStructs() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Convert the page list, applying the current user's authorisations
	var ps []*data.DomainPage
	for _, r := range dbRecs {
		ps = append(ps, r.DomainPage.CloneWithClearance(superuser, r.IsOwner.Valid && r.IsOwner.Bool))
	}

	// Succeeded
	return ps, nil
}

func (svc *pageService) UpdateReadonly(page *data.DomainPage) error {
	logger.Debugf("pageService.UpdateReadonly(%#v)", page)

	// Update the page record
	if err := db.ExecuteOne(
		db.Dialect().
			Update("cm_domain_pages").
			Set(goqu.Record{"is_readonly": page.IsReadonly}).
			Where(goqu.Ex{"id": &page.ID}),
	); err != nil {
		logger.Errorf("pageService.UpdateReadonly: ExecuteOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *pageService) UpsertByDomainPath(domain *data.Domain, path, title string, req *http.Request) (*data.DomainPage, bool, error) {
	logger.Debugf("pageService.UpsertByDomainPath(%#v, %q, %q, ...)", domain, path, title)

	// Prepare a new UUID
	id := uuid.New()

	// Query a page row
	increment := util.If(req != nil, 1, 0)
	row := db.SelectRow(
		db.Dialect().
			Insert(goqu.T("cm_domain_pages").As("p")).
			Rows(goqu.Record{
				"id":             &id,
				"domain_id":      &domain.ID,
				"path":           path,
				"title":          util.TruncateStr(title, data.MaxPageTitleLength), // Make sure the title doesn't exceed the size of the database field
				"is_readonly":    false,
				"ts_created":     time.Now().UTC(),
				"count_comments": 0,
				"count_views":    increment,
			}).
			OnConflict(goqu.DoUpdate("domain_id, path", goqu.C("count_views").Set(goqu.L("p.count_views + ?", increment)))).
			Returning("id", "domain_id", "path", "title", "is_readonly", "ts_created", "count_comments", "count_views"))

	// Fetch the row
	var p data.DomainPage
	if err := row.Scan(&p.ID, &p.DomainID, &p.Path, &p.Title, &p.IsReadonly, &p.CreatedTime, &p.CountComments, &p.CountViews); err != nil {
		logger.Errorf("pageService.UpsertByDomainPath: Scan() failed: %v", err)
		return nil, false, translateDBErrors(err)
	}

	// If the page was added
	added := p.ID == id
	if added {
		logger.Debug("pageService.UpsertByDomainPath: page didn't exist, created a new one with ID=%s", &id)

		// If no title was provided, fetch it in the background, ignoring possible errors
		if title == "" {
			go func() { _, _ = svc.FetchUpdatePageTitle(domain, &p) }()
		}
	}

	// Also register visit details in the background, if required
	if req != nil {
		go svc.insertPageView(p, req)
	}

	// Succeeded
	return &p, added, nil
}

// insertPageView registers a new page visit in the database
// NB: page isn't a pointer to isolate it from the calling code
func (svc *pageService) insertPageView(page data.DomainPage, req *http.Request) {
	logger.Debugf("pageService.insertPageView(%#v, ...)", page)

	// Extract the remote IP and country
	ip, country := util.UserIPCountry(req)

	// Parse the User Agent header
	ua := uasurfer.Parse(util.UserAgent(req))

	// Register the visit
	if err := db.ExecuteOne(
		db.Dialect().
			Insert("cm_domain_page_views").
			Rows(goqu.Record{
				"page_id":            &page.ID,
				"ts_created":         time.Now().UTC(),
				"proto":              req.Proto,
				"ip":                 config.MaskIP(ip),
				"country":            country,
				"ua_browser_name":    ua.Browser.Name.StringTrimPrefix(),
				"ua_browser_version": util.FormatVersion(&ua.Browser.Version),
				"ua_os_name":         ua.OS.Name.StringTrimPrefix(),
				"ua_os_version":      util.FormatVersion(&ua.OS.Version),
				"ua_device":          ua.DeviceType.StringTrimPrefix(),
			}),
	); err != nil {
		logger.Errorf("pageService.insertPageView: ExecuteOne() failed: %v", err)
	}
}
