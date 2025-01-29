package handlers

import (
	"fmt"
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"github.com/gorilla/feeds"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_rss"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"time"
)

func RssComments(params api_rss.RssCommentsParams) middleware.Responder {
	// Load the domain
	domain, r := domainGet(params.Domain)
	if r != nil {
		return r
	}

	// Extract page ID
	pageID, r := parseUUIDPtr(params.PageID)
	if r != nil {
		return r
	}

	// Fetch the page, if any
	var page *data.DomainPage
	if pageID != nil {
		var err error
		if page, err = svc.ThePageService.FindByID(pageID); err != nil {
			return respServiceError(err)
		}
	}

	// Extract user ID
	userID, r := parseUUIDPtr(params.UserID)
	if r != nil {
		return r
	}

	// Fetch the comments
	comments, commenters, err := svc.TheCommentService.ListWithCommentersByDomainPage(
		data.AnonymousUser, nil, &domain.ID, pageID, userID, true, false, false, false, false, "", "created",
		data.SortDesc, 0)
	if err != nil {
		return respServiceError(err)
	}

	// Construct feed URL
	feedURL := domain.RootURL()
	if page != nil {
		feedURL += page.Path
	}

	// Convert commenters into a map
	commenterMap := map[strfmt.UUID]*models.Commenter{}
	for _, cr := range commenters {
		commenterMap[cr.ID] = cr
	}

	// Convert the comments into RSS items
	items := make([]*feeds.Item, len(comments))
	for i, c := range comments {
		// Find the author
		author := data.AnonymousUser.Name
		if c.AuthorName != "" {
			author = c.AuthorName
		} else if cr, ok := commenterMap[c.UserCreated]; ok {
			author = cr.Name
		}

		// Convert the comment
		items[i] = &feeds.Item{
			Title:       fmt.Sprintf("%s | %s | Comentario", author, domain.Host),
			Link:        &feeds.Link{Href: string(c.URL)},
			Author:      &feeds.Author{Email: "noreply@comentario.app", Name: author},
			Description: c.HTML,
			Id:          c.ID.String(),
			IsPermaLink: "",
			Updated:     time.Time(c.EditedTime),
			Created:     time.Time(c.CreatedTime),
		}
	}

	// Get the latest comment date, if any
	created := time.Unix(0, 0)
	if len(comments) > 0 {
		created = time.Time(comments[0].CreatedTime)
	}

	// Succeeded. Provide the feed as a payload, the XMLAndRSSProducer will take care of encoding it
	return api_rss.NewRssCommentsOK().WithPayload(&feeds.Feed{
		Title:       "Comentario comments on " + domain.Host, // TODO i18n
		Link:        &feeds.Link{Href: feedURL},
		Description: "Comentario RSS Feed for " + feedURL, // TODO i18n
		Created:     created,
		Items:       items,
	})
}
