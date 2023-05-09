package svc

import (
	"database/sql"
	"fmt"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"strings"
	"time"
)

// ThePageService is a global PageService implementation
var ThePageService PageService = &pageService{}

// PageService is a service interface for dealing with pages
type PageService interface {
	// CommentCounts returns a map of comment counts by page path, for the specified host and multiple paths
	CommentCounts(host string, paths []string) (map[string]int, error)
	// FindByDomainPath finds and returns a pages for the specified domain ID and path combination. If no such page
	// exists in the database, return a nil DomainPage
	// TODO is this method needed?
	FindByDomainPath(domainID *uuid.UUID, path string) (*data.DomainPage, error)
	// GetRegisteringView queries a page, registering a new pageview, inserting a new database record if necessary
	GetRegisteringView(domainID *uuid.UUID, path string) (*data.DomainPage, error)
	// UpdateTitleByHostPath updates page title for the specified host and path combination
	UpdateTitleByHostPath(host, path string) (string, error)
	// UpsertByHostPath updates or inserts the page for the specified host and path combination
	UpsertByHostPath(page *data.DomainPage) error
}

//----------------------------------------------------------------------------------------------------------------------

// pageService is a blueprint PageService implementation
type pageService struct{}

func (svc *pageService) CommentCounts(host string, paths []string) (map[string]int, error) {
	logger.Debugf("pageService.CommentCounts(%s, ...)", host)

	/* TODO new-db
	// Query paths/comment counts
	rows, err := db.Query("select path, commentcount from pages where domain=$1 and path=any($2);", host, pq.Array(paths))
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
	*/

	// Succeeded
	return nil, nil
}

func (svc *pageService) GetRegisteringView(domainID *uuid.UUID, path string) (*data.DomainPage, error) {
	logger.Debugf("pageService.GetRegisteringView(%s, %s)", domainID, path)

	// Prepare a new UUID
	id := uuid.New()

	// Query a page row
	row := db.QueryRow(
		"insert into cm_domain_pages(id, domain_id, path, title, is_readonly, ts_created, count_comments, count_views) "+
			"values($1, $2, $3, '', false, $4, 0, 1) "+
			"on conflict update set count_views=count_views+1 "+
			"returning id, domain_id, path, title, is_readonly, ts_created, count_comments, count_views;",
		&id, domainID, path, time.Now().UTC())

	// Fetch the row
	var p data.DomainPage
	if err := row.Scan(&p.ID, &p.DomainID, &p.Path, &p.Title, &p.IsReadonly, &p.CreatedTime, &p.CountComments, &p.CountViews); err == sql.ErrNoRows {
		logger.Debug("pageService.GetRegisteringView: no page found yet")
		return nil, nil

	} else if err != nil {
		// Any other database error
		logger.Errorf("pageService.GetRegisteringView: Scan() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// If the page was added, fetch its title in the background
	if p.ID == id {
		// TODO new-db
		// go fetchPageTitle(...)
	}

	// TODO new-db also register visit details here (cm_page_views or so)
	// go insertPageView(...)

	// Succeeded
	return &p, nil
}

func (svc *pageService) FindByDomainPath(domainID *uuid.UUID, path string) (*data.DomainPage, error) {
	logger.Debugf("pageService.FindByDomainPath(%s, %s)", domainID, path)

	// Query a page row
	row := db.QueryRow(
		"select id, domain_id, path, title, is_readonly, ts_created, count_comments, count_views from cm_domain_pages "+
			"where domain_id=$1 and path=$2;",
		domainID, path)

	// Fetch the row
	var p data.DomainPage
	if err := row.Scan(&p.ID, &p.DomainID, &p.Path, &p.Title, &p.IsReadonly, &p.CreatedTime, &p.CountComments, &p.CountViews); err == sql.ErrNoRows {
		logger.Debug("pageService.FindByDomainPath: no page found yet")
		return nil, nil

	} else if err != nil {
		// Any other database error
		logger.Errorf("pageService.FindByDomainPath: Scan() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return &p, nil
}

func (svc *pageService) UpdateTitleByHostPath(host, path string) (string, error) {
	logger.Debugf("pageService.UpdateTitleByHostPath(%s, %s)", host, path)

	// Try to fetch the title
	fullPath := fmt.Sprintf("%s/%s", host, strings.TrimPrefix(path, "/"))
	title, err := util.HTMLTitleFromURL(fmt.Sprintf("http://%s", fullPath))

	// If fetching the title failed, just use domain/path combined as title
	if err != nil {
		title = fullPath
	}

	// Update the page in the database
	if err = db.Exec("update pages set title=$1 where domain=$2 and path=$3;", title, host, path); err != nil {
		logger.Errorf("pageService.UpdateTitleByHostPath: Exec() failed: %v", err)
		return "", translateDBErrors(err)
	}

	// Succeeded
	return title, nil
}

func (svc *pageService) UpsertByHostPath(page *data.DomainPage) error {
	logger.Debugf("pageService.UpsertByHostPath(%v)", page)

	// Persist a new record, ignoring when it already exists
	err := db.Exec(
		"insert into pages(domain, path, islocked, stickycommenthex) values($1, $2, $3, $4) "+
			"on conflict (domain, path) do update set isLocked=$3, stickyCommentHex=$4;",
		page.Host,
		page.Path,
		page.IsLocked,
		fixNone(page.StickyCommentHex))
	if err != nil {
		logger.Errorf("pageService.UpsertByHostPath: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}
