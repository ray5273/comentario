package svc

import (
	"github.com/avct/uasurfer"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"net/http"
	"net/url"
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
	logger.Debugf("pageService.GetRegisteringView(%#v, %s, ...)", domain, path)

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
	logger.Debugf("pageService.FindByDomainPath(%s, %s)", domainID, path)

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
	logger.Debugf("pageService.fetchUpdatePageTitle(%s, %s)", host, path)

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
