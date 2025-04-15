package svc

import (
	"database/sql"
	"encoding/xml"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"time"
)

type rssXML struct {
	XMLName  xml.Name     `xml:"rss"`
	Channels []rssChannel `xml:"channel"`
}

type rssChannel struct {
	XMLName xml.Name        `xml:"channel"`
	Items   []wordpressItem `xml:"item"`
}

type wordpressItem struct {
	XMLName  xml.Name           `xml:"item"`
	ID       string             `xml:"http://wordpress.org/export/1.2/ post_id"`
	Title    string             `xml:"title"`
	Link     string             `xml:"link"`
	Comments []wordpressComment `xml:"http://wordpress.org/export/1.2/ comment"`
}

type wordpressComment struct {
	XMLName     xml.Name             `xml:"http://wordpress.org/export/1.2/ comment"`
	ID          string               `xml:"http://wordpress.org/export/1.2/ comment_id"`
	Author      string               `xml:"http://wordpress.org/export/1.2/ comment_author"`
	AuthorEmail string               `xml:"http://wordpress.org/export/1.2/ comment_author_email"`
	AuthorURL   string               `xml:"http://wordpress.org/export/1.2/ comment_author_url"`
	AuthorIP    string               `xml:"http://wordpress.org/export/1.2/ comment_author_IP"`
	Date        string               `xml:"http://wordpress.org/export/1.2/ comment_date_gmt"`
	Content     string               `xml:"http://wordpress.org/export/1.2/ comment_content"`
	Approved    string               `xml:"http://wordpress.org/export/1.2/ comment_approved"`
	Type        wordpressCommentType `xml:"http://wordpress.org/export/1.2/ comment_type"`
	Parent      string               `xml:"http://wordpress.org/export/1.2/ comment_parent"`
}

type wordpressCommentType string

// IsRegular reports whether comment is a regular comment
func (ct wordpressCommentType) IsRegular() bool {
	// WordPress uses both "comment" and an empty string for regular comments
	return ct == "" || ct == "comment"
}

func wordpressImport(curUser *data.User, domain *data.Domain, buf []byte) *ImportResult {
	// Unmarshal the XML data
	exp := rssXML{}
	if err := xml.Unmarshal(buf, &exp); err != nil {
		logger.Errorf("wordpressImport/Unmarshal: %v", err)
		return importError(err)
	}

	result := &ImportResult{}

	// Fetch domain config
	maxLength := Services.DomainConfigService(nil).GetInt(&domain.ID, data.DomainConfigKeyMaxCommentLength)
	logger.Debugf("Max. comment text length is %d", maxLength)

	// Make sure there's at least one channel
	if len(exp.Channels) == 0 {
		return result.WithError(errors.New("no channels found in the RSS feed"))
	}

	// Create/map commenters: email -> ID
	var userIDMap map[string]uuid.UUID
	var err error
	if userIDMap, result.UsersAdded, result.DomainUsersAdded, err = wordpressMakeUserMap(&curUser.ID, &domain.ID, exp); err != nil {
		return result.WithError(err)
	}

	// Total number of users
	result.UsersTotal = len(userIDMap)

	// Iterate all posts
	pageIDMap := map[string]uuid.UUID{}
	commentParentIDMap := map[uuid.UUID][]*data.Comment{} // Groups comment lists by their parent ID
	for _, channel := range exp.Channels {
		for _, post := range channel.Items {
			result.PagesTotal++

			// Extract the path from link URL
			var pageID uuid.UUID
			if u, err := util.ParseAbsoluteURL(post.Link, true, false); err != nil {
				return result.WithError(err)

				// Find the page for that path
			} else if id, ok := pageIDMap[u.Path]; ok {
				pageID = id

				// Page doesn't exist. Find or insert a page with this path
			} else if page, added, err := Services.PageService(nil).UpsertByDomainPath(domain, u.Path, post.Title, nil); err != nil {
				return result.WithError(err)

			} else {
				pageID = page.ID
				pageIDMap[u.Path] = pageID

				// If the page was added, increment the page count
				if added {
					result.PagesAdded++
				}
			}

			// Make a map of comment IDs
			commentIDMap := map[string]uuid.UUID{}
			for _, comment := range post.Comments {
				// Only keep approved comments
				if !comment.Type.IsRegular() || comment.Approved != "1" {
					continue
				}
				// Allocate a new, random comment ID
				commentIDMap[comment.ID] = uuid.New()
			}

			// Iterate post's comments, once again
			for _, comment := range post.Comments {
				result.CommentsTotal++

				// Only keep approved comments
				if !comment.Type.IsRegular() || comment.Approved != "1" {
					result.CommentsSkipped++
					continue
				}

				// Find the comment ID (it must exist at this point)
				commentID, ok := commentIDMap[comment.ID]
				if !ok {
					err := fmt.Errorf("failed to map WordPress comment ID (%s)", comment.ID)
					logger.Errorf("wordpressImport: %v", err)
					return result.WithError(err)
				}

				// Find the user ID by their email
				uid := data.AnonymousUser.ID
				authorName := comment.Author
				if comment.AuthorEmail != "" {
					if id, ok := userIDMap[comment.AuthorEmail]; ok {
						uid = id
						authorName = ""
					}
				}

				// Find the parent comment ID. For indexing purposes only, root ID will be represented by a zero UUID.
				// It will also be the fallback, should parent ID not exist in the map
				parentCommentID := uuid.NullUUID{}
				pzID := util.ZeroUUID
				if id, ok := commentIDMap[comment.Parent]; ok {
					parentCommentID = uuid.NullUUID{UUID: id, Valid: true}
					pzID = id
				}

				// Create a new comment instance
				t := wordpressParseDate(comment.Date)
				c := &data.Comment{
					ID:            commentID,
					ParentID:      parentCommentID,
					PageID:        pageID,
					IsApproved:    true,
					CreatedTime:   t,
					ModeratedTime: sql.NullTime{Time: t, Valid: true},
					UserCreated:   uuid.NullUUID{UUID: uid, Valid: true},
					UserModerated: uuid.NullUUID{UUID: curUser.ID, Valid: true},
					AuthorName:    authorName,
				}

				// Update the comment's markdown and render it into HTML. Truncate comment text to avoid errors
				if err := Services.CommentService(nil).SetMarkdown(c, util.TruncateStr(comment.Content, maxLength), &domain.ID, nil); err != nil {
					return result.WithError(err)
				}

				// File it under the appropriate parent ID
				if l, ok := commentParentIDMap[pzID]; ok {
					commentParentIDMap[pzID] = append(l, c)
				} else {
					commentParentIDMap[pzID] = []*data.Comment{c}
				}
			}
		}
	}

	// Recurse the comment tree (map) to insert them in the right order (parents-to-children), starting with the root
	// (= zero UUID)
	countsPerPage := map[uuid.UUID]int{}
	result.CommentsImported, result.CommentsNonDeleted, result.Error = insertCommentsForParent(util.ZeroUUID, commentParentIDMap, countsPerPage)

	// Increase comment count on the domain, ignoring errors
	_ = Services.DomainService(nil).IncrementCounts(&domain.ID, result.CommentsNonDeleted, 0)

	// Increase comment counts on all pages
	for pageID, pc := range countsPerPage {
		if pc > 0 {
			_ = Services.PageService(nil).IncrementCounts(&pageID, pc, 0)
		}
	}

	// Done
	return result
}

// wordpressMakeUserMap creates a map of email -> user ID from the given Wordpress export data
func wordpressMakeUserMap(curUserID, domainID *uuid.UUID, exp rssXML) (userMap map[string]uuid.UUID, usersAdded, domainUsersAdded int, err error) {
	userIDMap := make(map[string]uuid.UUID)
	for _, channel := range exp.Channels {
		for _, post := range channel.Items {
			for _, comment := range post.Comments {
				// Only keep approved comments and skip users without name or email
				if !comment.Type.IsRegular() || comment.Approved != "1" || comment.Author == "" || comment.AuthorEmail == "" {
					continue
				}

				// Skip already existing users
				if _, ok := userIDMap[comment.AuthorEmail]; ok {
					continue
				}

				// Import the user and domain user
				var user *data.User
				var userAdded, domainUserAdded bool
				if user, userAdded, domainUserAdded, err = importUserByEmail(
					comment.AuthorEmail,
					"", // Local auth only
					comment.Author,
					comment.AuthorURL,
					"Imported from WordPress",
					true,
					false, // No SSO flag support in the export
					curUserID,
					domainID,
					wordpressParseDate(comment.Date),
				); err != nil {
					return
				}

				// Increment user counters
				if userAdded {
					usersAdded++
				}
				if domainUserAdded {
					domainUsersAdded++
				}

				// Add the user's email-to-ID mapping
				userIDMap[comment.AuthorEmail] = user.ID
			}
		}
	}

	// Succeeded
	return userIDMap, usersAdded, domainUsersAdded, nil
}

// wordpressParseDate parses a WordPress UTC/GMT date in the given string, returning the current time if parsing fails
func wordpressParseDate(s string) time.Time {
	// Try RFC3339 first
	t, err := time.ParseInLocation(time.RFC3339, s, time.UTC)
	if err != nil {
		// Next, a datetime
		if t, err = time.ParseInLocation(time.DateTime, s, time.UTC); err != nil {
			// Failed
			return time.Now().UTC()
		}
	}
	return t
}
