package svc

import (
	"database/sql"
	"encoding/xml"
	"fmt"
	md "github.com/JohannesKaufmann/html-to-markdown"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"regexp"
	"strings"
	"time"
)

type disqusThread struct {
	XMLName xml.Name `xml:"thread"`
	Id      string   `xml:"http://disqus.com/disqus-internals id,attr"`
	URL     string   `xml:"link"`
	Title   string   `xml:"title"`
}

type disqusAuthor struct {
	XMLName     xml.Name `xml:"author"`
	Name        string   `xml:"name"`
	IsAnonymous bool     `xml:"isAnonymous"`
	Username    string   `xml:"username"`
}

type disqusThreadId struct {
	XMLName xml.Name `xml:"thread"`
	Id      string   `xml:"http://disqus.com/disqus-internals id,attr"`
}

type disqusParentId struct {
	XMLName xml.Name `xml:"parent"`
	Id      string   `xml:"http://disqus.com/disqus-internals id,attr"`
}

type disqusPost struct {
	XMLName      xml.Name       `xml:"post"`
	Id           string         `xml:"http://disqus.com/disqus-internals id,attr"`
	ThreadId     disqusThreadId `xml:"thread"`
	ParentId     disqusParentId `xml:"parent"`
	Message      string         `xml:"message"`
	CreationDate time.Time      `xml:"createdAt"`
	IsDeleted    bool           `xml:"isDeleted"`
	IsSpam       bool           `xml:"isSpam"`
	Author       disqusAuthor   `xml:"author"`
}

type disqusXML struct {
	XMLName xml.Name       `xml:"disqus"`
	Threads []disqusThread `xml:"thread"`
	Posts   []disqusPost   `xml:"post"`
}

func disqusImport(curUser *data.User, domain *data.Domain, buf []byte) *ImportResult {
	// Unmarshal the XML data
	exp := disqusXML{}
	if err := xml.Unmarshal(buf, &exp); err != nil {
		logger.Errorf("disqusImport/Unmarshal: %v", err)
		return importError(err)
	}

	// Map Disqus thread IDs to threads
	threads := map[string]disqusThread{}
	for _, thread := range exp.Threads {
		threads[thread.Id] = thread
	}

	result := &ImportResult{}

	// Map Disqus emails to user IDs
	var userIDMap map[string]uuid.UUID
	var err error
	if userIDMap, result.UsersAdded, result.DomainUsersAdded, err = disqusMakeUserMap(&curUser.ID, &domain.ID, exp); err != nil {
		return result.WithError(err)
	}

	// Total number of users involved
	result.UsersTotal = len(userIDMap)

	// Prepare a map of Disqus Post ID -> Comment ID (randomly generated)
	postToCommentIDMap := make(map[string]uuid.UUID, len(exp.Posts))
	for _, post := range exp.Posts {
		postToCommentIDMap[post.Id] = uuid.New()
	}

	// Instantiate an HTML-to-Markdown converter
	hmConv := md.NewConverter("", true, nil)
	reHTMLTags := regexp.MustCompile(`<[^>]+>`)
	commentParentIDMap := map[uuid.UUID][]*data.Comment{} // Groups comment lists by their parent ID
	pageIDMap := map[string]uuid.UUID{}

	// Iterate over Disqus posts
	for _, post := range exp.Posts {
		result.CommentsTotal++

		// Skip over deleted and spam posts
		if post.IsDeleted || post.IsSpam {
			result.CommentsSkipped++
			continue
		}

		// Find the comment ID (it must exist at this point)
		commentID, ok := postToCommentIDMap[post.Id]
		if !ok {
			err := fmt.Errorf("failed to map Disqus post ID (%s) to comment ID", post.Id)
			logger.Errorf("disqusImport: %v", err)
			return result.WithError(err)
		}

		// Find the user ID by their email
		uid := data.AnonymousUser.ID
		authorName := post.Author.Name
		if email := disqusAuthorEmail(&post.Author); email != "" {
			if id, ok := userIDMap[email]; ok {
				uid = id
				authorName = ""
			}
		}

		// Extract the path from thread URL
		var pageID uuid.UUID
		thread := threads[post.ThreadId.Id]
		if u, err := util.ParseAbsoluteURL(thread.URL, true, false); err != nil {
			return result.WithError(err)

			// Find the page for that path
		} else if id, ok := pageIDMap[u.Path]; ok {
			pageID = id

			// Page doesn't exist. Find or insert a page with this path
		} else if page, added, err := Services.PageService(nil).UpsertByDomainPath(domain, u.Path, thread.Title, nil); err != nil {
			return result.WithError(err)

		} else {
			pageID = page.ID
			pageIDMap[u.Path] = pageID

			// If the page was added, increment the page count
			if added {
				result.PagesAdded++
			}
		}

		// Find the parent comment ID. For indexing purposes only, root ID will be represented by a zero UUID. It will
		// also be the fallback, should parent ID not exist in the map
		parentCommentID := uuid.NullUUID{}
		pzID := util.ZeroUUID
		if id, ok := postToCommentIDMap[post.ParentId.Id]; ok {
			parentCommentID = uuid.NullUUID{UUID: id, Valid: true}
			pzID = id
		}

		// "Reverse-convert" comment text to Markdown
		markdown, err := hmConv.ConvertString(post.Message)
		if err != nil {
			// Just strip all tags on error
			markdown = reHTMLTags.ReplaceAllString(post.Message, "")
		}

		// Create a new comment instance
		c := &data.Comment{
			ID:            commentID,
			ParentID:      parentCommentID,
			PageID:        pageID,
			Markdown:      markdown,
			HTML:          post.Message,
			IsApproved:    true,
			CreatedTime:   post.CreationDate,
			ModeratedTime: sql.NullTime{Time: post.CreationDate, Valid: true},
			UserCreated:   uuid.NullUUID{UUID: uid, Valid: true},
			UserModerated: uuid.NullUUID{UUID: curUser.ID, Valid: true},
			AuthorName:    authorName,
		}

		// File it under the appropriate parent ID
		if l, ok := commentParentIDMap[pzID]; ok {
			commentParentIDMap[pzID] = append(l, c)
		} else {
			commentParentIDMap[pzID] = []*data.Comment{c}
		}
	}

	// Total number of pages involved
	result.PagesTotal = len(pageIDMap)

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

// disqusAuthorEmail comes up with a (fake) email address for a Disqus Author
func disqusAuthorEmail(a *disqusAuthor) string {
	// If there's a username, use that
	if s := strings.TrimSpace(a.Username); s != "" {
		return fmt.Sprintf("%s@disqus-user", s)
	}

	// If there's a name, use that
	if s := strings.TrimSpace(a.Name); s != "" {
		return fmt.Sprintf("%s@disqus-anonymous-user", s)
	}

	// The user is anonymous
	return ""
}

// disqusMakeUserMap creates users/domain users from the provided Disqus import dump, and returns that as a map {email: userID}
func disqusMakeUserMap(curUserID, domainID *uuid.UUID, exp disqusXML) (userIDMap map[string]uuid.UUID, usersAdded, domainUsersAdded int, err error) {
	userIDMap = map[string]uuid.UUID{}

	// Iterate over the posts
	for _, post := range exp.Posts {
		// Skip over deleted and spam posts
		if post.IsDeleted || post.IsSpam {
			continue
		}

		// Skip anonymous
		email := disqusAuthorEmail(&post.Author)
		if email == "" {
			continue
		}

		// Skip authors whose email has already been processed
		if _, ok := userIDMap[email]; ok {
			continue
		}

		// Import the user and domain user
		var user *data.User
		var userAdded, domainUserAdded bool
		if user, userAdded, domainUserAdded, err = importUserByEmail(
			email,
			"", // Local auth only
			post.Author.Name,
			"", // Website URL isn't available
			"Imported from Disqus",
			false, // The email is a fake one
			false, // No SSO flag support in the export
			curUserID,
			domainID,
			post.CreationDate,
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
		userIDMap[email] = user.ID
	}

	// Succeeded
	return userIDMap, usersAdded, domainUsersAdded, nil
}
