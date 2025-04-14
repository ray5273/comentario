package handlers

import (
	"fmt"
	"github.com/go-openapi/runtime/middleware"
	"github.com/google/uuid"
	"github.com/gorilla/feeds"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_rss"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
	"strings"
	"time"
)

func RssComments(params api_rss.RssCommentsParams) middleware.Responder {
	title := []string{"Comentario"}

	// Load the domain
	domain, r := domainGet(params.Domain)
	if r != nil {
		return r
	}
	feedURL := domain.RootURL()

	// Verify RSS is enabled for this domain
	if !svc.Services.DomainConfigService(nil).GetBool(&domain.ID, data.DomainConfigKeyRSSEnabled) {
		return respForbidden(exmodels.ErrorFeatureDisabled.WithDetails("RSS"))
	}

	// Extract page ID
	pageID, r := parseUUIDPtr(params.Page)
	if r != nil {
		return r
	}

	// Fetch the page, if any
	var page *data.DomainPage
	if pageID == nil {
		title = append(title, "comments")
	} else {
		var err error
		if page, err = svc.Services.PageService(nil).FindByID(pageID); err != nil {
			return respServiceError(err)
		}
		feedURL += page.Path
		title = append(title, "page comments")
	}

	// Extract author user ID
	author, r := userGetOptional(params.Author)
	if r != nil {
		return r
	}
	var authorUserID *uuid.UUID
	if author != nil {
		authorUserID = &author.ID
		title = append(title, "by", author.Name)
	}

	// Extract reply-to user ID
	replyToUser, r := userGetOptional(params.ReplyToUser)
	if r != nil {
		return r
	}
	var replyToUserID *uuid.UUID
	if replyToUser != nil {
		replyToUserID = &replyToUser.ID
		title = append(title, "in reply to", replyToUser.Name)
	}

	// Add domain to the title
	title = append(title, "on", domain.Host)

	// Fetch the comments
	comments, commenterMap, err := svc.Services.CommentService(nil).ListWithCommenters(
		data.AnonymousUser, nil, &domain.ID, pageID, authorUserID, replyToUserID, true, false, false, false, false, "",
		"created", data.SortDesc, 0)
	if err != nil {
		return respServiceError(err)
	}

	// Convert the comments into RSS items
	items := make([]*feeds.Item, len(comments))
	for i, c := range comments {
		// Find the author
		cAuthor := data.AnonymousUser.Name
		if c.AuthorName != "" {
			cAuthor = c.AuthorName
		} else if aID, err := uuid.Parse(string(c.UserCreated)); err == nil {
			if cr, ok := commenterMap[aID]; ok {
				cAuthor = cr.Name
			}
		}

		// Convert the comment
		items[i] = &feeds.Item{
			Title:       fmt.Sprintf("%s | %s | Comentario", cAuthor, domain.Host),
			Link:        &feeds.Link{Href: string(c.URL)},
			Author:      &feeds.Author{Name: cAuthor}, // Only include name as Email is omitted anyway
			Description: c.HTML,
			Id:          c.ID.String(),
			IsPermaLink: "false",
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
	// NB: it would be nice to localise the title and the description, but there's no way to define the feed's
	// language; it may also vary depending on the specific page of the domain. So we keep it in English.
	ts := strings.Join(title, " ")
	return api_rss.NewRssCommentsOK().WithPayload(&feeds.Feed{
		Title:       ts,
		Link:        &feeds.Link{Href: feedURL},
		Description: util.TruncateStr("Comentario RSS Feed for "+feedURL, 200),
		Created:     created,
		Items:       items,
		Image: &feeds.Image{
			Url:    config.ServerConfig.URLFor("icon-rss-64px.png", nil),
			Title:  ts,
			Link:   feedURL,
			Width:  64,
			Height: 64,
		},
	})
}
