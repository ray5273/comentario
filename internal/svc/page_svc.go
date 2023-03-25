package svc

import (
	"database/sql"
	"fmt"
	"github.com/lib/pq"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/util"
	"strings"
)

// ThePageService is a global PageService implementation
var ThePageService PageService = &pageService{}

// PageService is a service interface for dealing with pages
type PageService interface {
	// CommentCounts returns a map of comment counts by page path, for the specified host and multiple paths
	CommentCounts(host models.Host, paths []string) (map[string]int, error)
	// DeleteByHost deletes all pages for the specified host
	DeleteByHost(host models.Host) error
	// FindByHostPath finds and returns a pages for the specified host and path combination. If no such page exists in
	// the database, return a new default Page model
	FindByHostPath(host models.Host, path string) (*models.Page, error)
	// UpdateTitleByHostPath updates page title for the specified host and path combination
	UpdateTitleByHostPath(host models.Host, path string) (string, error)
	// UpsertByHostPath updates or inserts the page for the specified host and path combination
	UpsertByHostPath(page *models.Page) error
}

//----------------------------------------------------------------------------------------------------------------------

// pageService is a blueprint PageService implementation
type pageService struct{}

func (svc *pageService) CommentCounts(host models.Host, paths []string) (map[string]int, error) {
	logger.Debugf("pageService.CommentCounts(%s, ...)", host)

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

	// Succeeded
	return res, nil
}

func (svc *pageService) DeleteByHost(host models.Host) error {
	logger.Debugf("pageService.DeleteByHost(%s)", host)

	// Delete records from the database
	if err := db.Exec("delete from pages where domain=$1;", host); err != nil {
		logger.Errorf("pageService.DeleteByHost: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *pageService) FindByHostPath(host models.Host, path string) (*models.Page, error) {
	logger.Debugf("pageService.FindByHostPath(%s, %s)", host, path)

	// Query a page row
	row := db.QueryRow(
		"select domain, path, islocked, commentcount, stickycommenthex, title from pages where domain=$1 and path=$2;",
		host,
		path)

	// Fetch the row
	var p models.Page
	sch := ""
	if err := row.Scan(&p.Host, &p.Path, &p.IsLocked, &p.CommentCount, &sch, &p.Title); err == sql.ErrNoRows {
		logger.Debug("pageService.FindByHostPath: no page found, creating a new one")

		// No page in the database means there's no comment created yet for that page: make a default Page instance
		p.Host = host
		p.Path = path

	} else if err != nil {
		// Any other database error
		logger.Errorf("pageService.FindByHostPath: Scan() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Perform necessary fixes
	p.StickyCommentHex = unfixNone(sch)

	// Succeeded
	return &p, nil
}

func (svc *pageService) UpdateTitleByHostPath(host models.Host, path string) (string, error) {
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

func (svc *pageService) UpsertByHostPath(page *models.Page) error {
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
