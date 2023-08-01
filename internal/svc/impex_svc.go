package svc

import (
	"database/sql"
	"encoding/json"
	"encoding/xml"
	"fmt"
	md "github.com/JohannesKaufmann/html-to-markdown"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"io"
	"regexp"
	"time"
)

// TheImportExportService is a global ImportExportService implementation
var TheImportExportService ImportExportService = &importExportService{}

// ImportExportService is a service interface for dealing with data import/export
type ImportExportService interface {
	// Export exports the data for the specified domain, returning gzip-compressed binary data
	Export(domainID *uuid.UUID) ([]byte, error)
	// ImportCommento performs data import in the "commento" format from the provided data buffer. Returns the number of
	// imported comments
	ImportCommento(domain *data.Domain, reader io.Reader) (uint64, error)
	// ImportDisqus performs data import from Disqus from the provided data buffer. Returns the number of imported
	// comments
	ImportDisqus(curUser *data.User, domain *data.Domain, reader io.Reader) (uint64, error)
}

//----------------------------------------------------------------------------------------------------------------------

// importExportService is a blueprint ImportExportService implementation
type importExportService struct{}

type commentoExportV1 struct {
	Version    int                `json:"version"`
	Comments   []models.Comment   `json:"comments"`
	Commenters []models.Commenter `json:"commenters"`
}

type comentarioExportV3 struct {
	Version    int                  `json:"version"`
	Pages      []*models.DomainPage `json:"pages"`
	Comments   []*models.Comment    `json:"comments"`
	Commenters []*models.Commenter  `json:"commenters"`
}

type disqusThread struct {
	XMLName xml.Name `xml:"thread"`
	Id      string   `xml:"http://disqus.com/disqus-internals id,attr"`
	URL     string   `xml:"link"`
	Name    string   `xml:"name"`
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

func (svc *importExportService) Export(domainID *uuid.UUID) ([]byte, error) {
	logger.Debugf("importExportService.Export(%s)", domainID)

	// Create an export data object
	exp := comentarioExportV3{Version: 3}

	// Fetch pages
	if ps, err := ThePageService.ListByDomain(domainID); err != nil {
		return nil, err
	} else {
		exp.Pages = data.SliceToDTOs[*data.DomainPage, *models.DomainPage](ps)
	}

	// Fetch comments
	if cs, err := TheCommentService.ListByDomain(domainID); err != nil {
		return nil, err
	} else {
		exp.Comments = cs
	}

	// Fetch commenters
	if um, dus, err := TheUserService.ListByDomain(domainID, false, "", "", data.SortAsc, -1); err != nil {
		return nil, err
	} else {
		cs := make([]*models.Commenter, 0, len(dus))
		for _, du := range dus {
			// Find the related user instance
			if u, ok := um[du.UserID]; ok {
				// Convert the User/DomainUser combo into a commenter
				cs = append(cs, u.ToCommenter(du.IsCommenter, du.IsModerator))
			}
		}
		exp.Commenters = cs
	}

	// Convert the data into JSON
	jsonData, err := json.Marshal(exp)
	if err != nil {
		logger.Errorf("importExportService.Export: json.Marshal() failed: %v", err)
		return nil, err
	}

	// Compress the JSON data with Gzip
	gzippedData, err := util.CompressGzip(jsonData)
	if err != nil {
		logger.Errorf("importExportService.Export: CompressGzip() failed: %v", err)
		return nil, err
	}

	// Succeeded
	return gzippedData, nil
}

func (svc *importExportService) ImportCommento(domain *data.Domain, reader io.Reader) (uint64, error) {
	logger.Debugf("importExportService.ImportCommento(%#v, ...)", domain)

	count := uint64(0)
	/* TODO new-db
	// Fetch and decompress the export tarball
	d, err := util.DecompressGzip(reader)
	if err != nil {
		logger.Errorf("importExportService.ImportCommento: DecompressGzip() failed: %v", err)
		return 0, err
	}

	// Unmarshal the data
	var exp commentoExportV1
	if err := json.Unmarshal(d, &exp); err != nil {
		logger.Errorf("importExportService.ImportCommento: json.Unmarshal() failed: %v", err)
		return 0, err
	}

	// Verify the export format version
	if exp.Version != 1 {
		logger.Errorf("importExportService.ImportCommento: invalid export version (got %d, want 1)", exp.Version)
		return 0, fmt.Errorf("invalid export version (%d)", exp.Version)
	}

	// Check if imported commentedHex or email exists, creating a map of commenterHex (old hex, new hex)
	commenterHex := map[models.HexID]models.HexID{data.AnonymousCommenter.HexID: data.AnonymousCommenter.HexID}
	for _, commenter := range exp.Commenters {
		// Try to find an existing commenter with the same email
		if c, err := TheUserService.FindCommenterByIdPEmail("", string(commenter.Email), false); err == nil {
			// Commenter already exists. Add its hex ID to the map and proceed to the next record
			commenterHex[commenter.CommenterHex] = c.HexID
			continue

		} else if err != ErrNotFound {
			// Any other error than "not found"
			return 0, err
		}

		// Generate a random password string
		randomPassword, err := data.RandomHexID()
		if err != nil {
			logger.Errorf("importExportService.ImportCommento: RandomHexID() failed: %v", err)
			return 0, err
		}

		// Persist a new commenter instance
		if c, err := TheUserService.CreateCommenter(string(commenter.Email), commenter.Name, string(commenter.WebsiteURL), string(commenter.AvatarURL), "", string(randomPassword)); err != nil {
			return 0, err
		} else {
			// Save the new commenter's hex ID in the map
			commenterHex[commenter.CommenterHex] = c.HexID
		}
	}

	// Create a map of (parent hex, comments)
	comments := map[models.ParentHexID][]models.Comment{}
	for _, comment := range exp.Comments {
		comments[comment.ParentHex] = append(comments[comment.ParentHex], comment)
	}

	// Import comments, creating a map of comment hex (old hex, new hex)
	commentHex := map[models.ParentHexID]models.ParentHexID{data.RootParentHexID: data.RootParentHexID}
	keys := []models.ParentHexID{data.RootParentHexID}
	for i := 0; i < len(keys); i++ {
		for _, comment := range comments[keys[i]] {
			// Find the comment's author
			cHex, ok := commenterHex[comment.CommenterHex]
			if !ok {
				logger.Errorf("importExportService.ImportCommento: failed to find mapped commenter (hex=%v)", comment.CommenterHex)
				return count, fmt.Errorf("failed to find mapped commenter (hex=%v)", comment.CommenterHex)
			}

			// Find the parent comment
			parentHex, ok := commentHex[comment.ParentHex]
			if !ok {
				logger.Errorf("importExportService.ImportCommento: failed to find parent comment (hex=%v)", comment.ParentHex)
				return count, fmt.Errorf("failed to find parent comment (hex=%v)", comment.ParentHex)
			}

			// Add a new comment record
			newComment, err := TheCommentService.Create(cHex, host, comment.Path, comment.Markdown, parentHex, comment.State, comment.CreationDate)
			if err != nil {
				return count, err
			}

			// Store the comment's hex ID in the map
			commentHex[models.ParentHexID(comment.CommentHex)] = models.ParentHexID(newComment.CommentHex)
			keys = append(keys, models.ParentHexID(comment.CommentHex))

			// Import record counter
			count++
		}
	}
	*/
	// Succeeded
	return count, nil
}

func (svc *importExportService) ImportDisqus(curUser *data.User, domain *data.Domain, reader io.Reader) (uint64, error) {
	logger.Debugf("importExportService.ImportDisqus(%#v, %#v, ...)", curUser, domain)

	// Fetch and decompress the export tarball
	d, err := util.DecompressGzip(reader)
	if err != nil {
		logger.Errorf("importExportService.ImportDisqus: DecompressGzip() failed: %v", err)
		return 0, err
	}

	// Unmarshal the XML data
	exp := disqusXML{}
	err = xml.Unmarshal(d, &exp)
	if err != nil {
		logger.Errorf("importExportService.ImportDisqus: xml.Unmarshal() failed: %v", err)
		return 0, err
	}

	// Map Disqus thread IDs to threads
	threads := map[string]disqusThread{}
	for _, thread := range exp.Threads {
		threads[thread.Id] = thread
	}

	// Map Disqus emails to user IDs (if not available, create a new one with an empty password that can be reset later)
	userIDMap := map[string]uuid.UUID{}
	for _, post := range exp.Posts {
		if post.IsDeleted || post.IsSpam {
			continue
		}

		// Skip authors whose email has already been processed
		email := fmt.Sprintf("%s@disqus.com", post.Author.Username)
		if _, ok := userIDMap[email]; ok {
			continue
		}

		// Try to find an existing user with this email
		if u, err := TheUserService.FindUserByEmail(email, false); err == nil {
			// User already exists. Add its ID to the map and proceed to the next record
			userIDMap[email] = u.ID
			continue
		} else if err != ErrNotFound {
			// Any other error than "not found"
			return 0, err
		}

		// Persist a new user instance
		user := data.NewUser(email, post.Author.Name)
		user.UserCreated = uuid.NullUUID{UUID: curUser.ID, Valid: true}
		user.WithRemarks("Imported from Disqus")
		if err := TheUserService.Create(user); err != nil {
			return 0, err
		} else {
			// Save the new user's ID in the map
			userIDMap[email] = user.ID
		}
	}

	// Instantiate a HTML-to-Markdown converter
	hmConv := md.NewConverter("", true, nil)
	reHTMLTags := regexp.MustCompile(`<[^>]+>`)
	commentIDMap := map[string]uuid.UUID{}
	commentParentIDMap := map[uuid.UUID][]*data.Comment{} // Groups comment lists by their parent ID
	pageIDMap := map[string]uuid.UUID{}

	// Iterate over Disqus posts
	for _, post := range exp.Posts {
		// Skip over deleted and spam posts
		if post.IsDeleted || post.IsSpam {
			continue
		}

		// Find the user ID by their email
		uid := data.AnonymousUser.ID
		if !post.Author.IsAnonymous {
			if id, ok := userIDMap[fmt.Sprintf("%s@disqus.com", post.Author.Username)]; ok {
				uid = id
			}
		}

		// Extract the path from thread URL
		var pageID uuid.UUID
		if u, err := util.ParseAbsoluteURL(threads[post.ThreadId.Id].URL, true); err != nil {
			return 0, err

			// Find the page for that path
		} else if id, ok := pageIDMap[u.Path]; ok {
			pageID = id

			// Find or insert a page with this path
		} else if page, err := ThePageService.UpsertByDomainPath(domain, u.Path, nil); err != nil {
			return 0, err

		} else {
			pageID = page.ID
		}

		// Find the parent comment ID
		parentCommentID := uuid.NullUUID{}
		pzID := uuid.UUID{} // For indexing purposes only, root ID will be represented by a zero UUID
		if id, ok := commentIDMap[post.ParentId.Id]; ok {
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
		// TODO restrict the list of tags to just the basics: <a>, <b>, <i>, <code>. Especially remove <img> (convert it to <a>)
		c := &data.Comment{
			ID:           uuid.New(),
			ParentID:     parentCommentID,
			PageID:       pageID,
			Markdown:     markdown,
			HTML:         post.Message,
			IsApproved:   true,
			CreatedTime:  post.CreationDate,
			ApprovedTime: sql.NullTime{Time: post.CreationDate, Valid: true},
			UserCreated:  uuid.NullUUID{UUID: uid, Valid: true},
			UserApproved: uuid.NullUUID{UUID: curUser.ID, Valid: true},
		}

		// File it under the appropriate parent ID
		if l, ok := commentParentIDMap[pzID]; ok {
			commentParentIDMap[pzID] = append(l, c)
		} else {
			commentParentIDMap[pzID] = []*data.Comment{c}
		}

		// Add the comment's ID to the map
		commentIDMap[post.Id] = c.ID
	}

	// Recurse the comment tree (map) to insert them in the right order (parents-to-children), starting with the root
	// (= zero UUID)
	countsPerPage := map[uuid.UUID]int{}
	count, err := svc.insertCommentsForParent(uuid.UUID{}, commentParentIDMap, countsPerPage)

	// Increase comment count on the domain, ignoring errors
	_ = TheDomainService.IncrementCounts(&domain.ID, count, 0)

	// Increase comment counts on all pages
	for pageID, pc := range countsPerPage {
		if pc > 0 {
			_ = ThePageService.IncrementCounts(&pageID, pc, 0)
		}
	}

	// Done
	return uint64(count), err
}

// insertCommentsForParent inserts those comments from the map that have the specified parent ID, returning the number
// of successfully inserted comments
func (svc *importExportService) insertCommentsForParent(parentID uuid.UUID, commentParentMap map[uuid.UUID][]*data.Comment, countsPerPage map[uuid.UUID]int) (count int, err error) {
	for _, c := range commentParentMap[parentID] {
		// Insert the comment
		if err = TheCommentService.Create(c); err != nil {
			return
		}
		count++
		countsPerPage[c.PageID] = countsPerPage[c.PageID] + 1

		// Insert any children of the comment
		var cc int
		if cc, err = svc.insertCommentsForParent(c.ID, commentParentMap, countsPerPage); err != nil {
			return
		}
		count += cc
	}
	return
}
