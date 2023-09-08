package svc

import (
	"database/sql"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	md "github.com/JohannesKaufmann/html-to-markdown"
	"github.com/go-openapi/strfmt"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"io"
	"regexp"
	"strings"
	"time"
)

// ImportResult is the result of a comment import
type ImportResult struct {
	UsersTotal         int   // Total number of users
	UsersAdded         int   // Number of added users
	DomainUsersAdded   int   // Number of added domain users
	PagesTotal         int   // Total number of domain pages
	PagesAdded         int   // Number of added domain pages
	CommentsTotal      int   // Total number of comments processed
	CommentsImported   int   // Number of imported comments
	CommentsSkipped    int   // Number of skipped comments
	CommentsNonDeleted int   // Number of non-deleted imported comments
	Error              error // Any error occurred during the import
}

// ToDTO converts the result to an API model
func (ir *ImportResult) ToDTO() *models.ImportResult {
	dto := &models.ImportResult{
		CommentsImported:   uint64(ir.CommentsImported),
		CommentsNonDeleted: uint64(ir.CommentsNonDeleted),
		CommentsSkipped:    uint64(ir.CommentsSkipped),
		CommentsTotal:      uint64(ir.CommentsTotal),
		DomainUsersAdded:   uint64(ir.DomainUsersAdded),
		PagesAdded:         uint64(ir.PagesAdded),
		PagesTotal:         uint64(ir.PagesTotal),
		UsersAdded:         uint64(ir.UsersAdded),
		UsersTotal:         uint64(ir.UsersTotal),
	}
	if ir.Error != nil {
		dto.Error = ir.Error.Error()
	}
	return dto
}

// WithError sets the error in the result and returns the result
func (ir *ImportResult) WithError(err error) *ImportResult {
	ir.Error = err
	return ir
}

//----------------------------------------------------------------------------------------------------------------------

// TheImportExportService is a global ImportExportService implementation
var TheImportExportService ImportExportService = &importExportService{}

// ImportExportService is a service interface for dealing with data import/export
type ImportExportService interface {
	// Export exports the data for the specified domain, returning gzip-compressed binary data
	Export(domainID *uuid.UUID) ([]byte, error)
	// Import performs data import in the native Comentario (or legacy Commento v1/Comentario v2) format from the
	// provided data reader. Returns the number of imported comments: total and non-deleted
	Import(curUser *data.User, domain *data.Domain, reader io.Reader) *ImportResult
	// ImportDisqus performs data import from Disqus from the provided data reader. Returns the number of imported
	// comments
	ImportDisqus(curUser *data.User, domain *data.Domain, reader io.Reader) *ImportResult
}

//----------------------------------------------------------------------------------------------------------------------

// comentarioExportMeta is the export metadata header
type comentarioExportMeta struct {
	Version int `json:"version"`
}

//----------------------------------------------------------------------------------------------------------------------
// V1 export format
//----------------------------------------------------------------------------------------------------------------------

type HexIDV1 string

type comentarioExportV1 struct {
	Version    int           `json:"version"`
	Comments   []CommentV1   `json:"comments"`
	Commenters []CommenterV1 `json:"commenters"`
}

type CommentV1 struct {
	CommentHex   HexIDV1   `json:"commentHex"`
	CommenterHex HexIDV1   `json:"commenterHex"`
	CreationDate time.Time `json:"creationDate"`
	Deleted      bool      `json:"deleted"`
	Direction    int       `json:"direction"`
	Host         string    `json:"host"`
	HTML         string    `json:"html"`
	Markdown     string    `json:"markdown"`
	ParentHex    HexIDV1   `json:"parentHex"`
	Path         string    `json:"path"`
	URL          string    `json:"url"`
	Score        int       `json:"score"`
	State        string    `json:"state"`
}

type CommenterV1 struct {
	AvatarURL    string    `json:"avatarUrl"`
	CommenterHex HexIDV1   `json:"commenterHex"`
	Email        string    `json:"email"`
	IsModerator  bool      `json:"isModerator"`
	JoinDate     time.Time `json:"joinDate"`
	Name         string    `json:"name"`
	Provider     string    `json:"provider"`
	WebsiteURL   string    `json:"websiteUrl"`
}

const AnonymousCommenterHexIDV1 = HexIDV1("0000000000000000000000000000000000000000000000000000000000000000")

//----------------------------------------------------------------------------------------------------------------------
// V3 export format
//----------------------------------------------------------------------------------------------------------------------

type comentarioExportV3 struct {
	Version    int                  `json:"version"`
	Pages      []*models.DomainPage `json:"pages"`
	Comments   []*models.Comment    `json:"comments"`
	Commenters []*models.Commenter  `json:"commenters"`
}

//----------------------------------------------------------------------------------------------------------------------
// Disqus export format
//----------------------------------------------------------------------------------------------------------------------

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

//----------------------------------------------------------------------------------------------------------------------
// V1 export format
//----------------------------------------------------------------------------------------------------------------------

// importExportService is a blueprint ImportExportService implementation
type importExportService struct{}

// importError returns an ImportResult containing only the specified error
func importError(err error) *ImportResult {
	return &ImportResult{Error: err}
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

func (svc *importExportService) Import(curUser *data.User, domain *data.Domain, reader io.Reader) *ImportResult {
	logger.Debugf("importExportService.Import(%#v, %#v, ...)", curUser, domain)

	// Fetch and decompress the export tarball
	buf, err := util.DecompressGzip(reader)
	if err != nil {
		logger.Errorf("importExportService.Import: DecompressGzip() failed: %v", err)
		return importError(err)
	}

	// Unmarshal the metadata to determine the format version
	var exp comentarioExportMeta
	if err := json.Unmarshal(buf, &exp); err != nil {
		logger.Errorf("importExportService.Import: json.Unmarshal() failed: %v", err)
		return importError(err)
	}
	logger.Debugf("Comentario export version: %d", exp.Version)

	switch exp.Version {
	case 1:
		return svc.importV1(curUser, domain, buf)

	case 3:
		return svc.importV3(curUser, domain, buf)

	default:
		// Unrecognised version
		err := fmt.Errorf("invalid Comentario export version (%d)", exp.Version)
		logger.Errorf("importExportService.Import: %v", err)
		return importError(err)
	}
}

func (svc *importExportService) ImportDisqus(curUser *data.User, domain *data.Domain, reader io.Reader) *ImportResult {
	logger.Debugf("importExportService.ImportDisqus(%#v, %#v, ...)", curUser, domain)

	// Fetch and decompress the export tarball
	d, err := util.DecompressGzip(reader)
	if err != nil {
		logger.Errorf("importExportService.ImportDisqus: DecompressGzip() failed: %v", err)
		return importError(err)
	}

	// Unmarshal the XML data
	exp := disqusXML{}
	err = xml.Unmarshal(d, &exp)
	if err != nil {
		logger.Errorf("importExportService.ImportDisqus: xml.Unmarshal() failed: %v", err)
		return importError(err)
	}

	// Map Disqus thread IDs to threads
	threads := map[string]disqusThread{}
	for _, thread := range exp.Threads {
		threads[thread.Id] = thread
	}

	result := &ImportResult{}

	// Map Disqus emails to user IDs (if not available, create a new one with an empty password that can be reset later)
	userIDMap := map[string]uuid.UUID{}
	for _, post := range exp.Posts {
		result.CommentsTotal++
		if post.IsDeleted || post.IsSpam {
			result.CommentsSkipped++
			continue
		}

		// Skip authors whose email has already been processed
		email := fmt.Sprintf("%s@disqus.com", post.Author.Username)
		if _, ok := userIDMap[email]; ok {
			continue
		}

		// Try to find an existing user with this email
		var user *data.User
		if u, err := TheUserService.FindUserByEmail(email, false); err == nil {
			// User already exists
			user = u

			// Check if domain user exists, too
			if _, _, err := TheDomainService.FindDomainUserByID(&domain.ID, &u.ID); err == nil {
				// Save the user's ID in the map
				userIDMap[email] = user.ID

				// Proceed to the next record
				continue

			} else if !errors.Is(err, ErrNotFound) {
				// Any other error than "not found"
				return result.WithError(err)
			}

		} else if !errors.Is(err, ErrNotFound) {
			// Any other error than "not found"
			return result.WithError(err)
		}

		// Persist a new user instance, if not already exists
		if user == nil {
			user = data.NewUser(email, post.Author.Name)
			user.UserCreated = uuid.NullUUID{UUID: curUser.ID, Valid: true}
			user.WithRemarks("Imported from Disqus")
			if err := TheUserService.Create(user); err != nil {
				return result.WithError(err)
			}
			result.UsersAdded++
		}

		// Save the new user's ID in the map
		userIDMap[email] = user.ID

		// Add a domain user as well
		du := &data.DomainUser{
			DomainID:        domain.ID,
			UserID:          user.ID,
			IsCommenter:     true,
			NotifyReplies:   true,
			NotifyModerator: true,
			CreatedTime:     post.CreationDate,
		}
		if err := TheDomainService.UserAdd(du); err != nil {
			return result.WithError(err)
		}
		result.DomainUsersAdded++
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
		// Skip over deleted and spam posts
		if post.IsDeleted || post.IsSpam {
			continue
		}

		// Find the comment ID (it must exist at this point)
		commentID, ok := postToCommentIDMap[post.Id]
		if !ok {
			err := fmt.Errorf("failed to map disqus post ID (%s) to comment ID", post.Id)
			logger.Errorf("importExportService.ImportDisqus: %v", err)
			return result.WithError(err)
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
			return result.WithError(err)

			// Find the page for that path
		} else if id, ok := pageIDMap[u.Path]; ok {
			pageID = id

			// Page doesn't exist. Find or insert a page with this path
		} else if page, added, err := ThePageService.UpsertByDomainPath(domain, u.Path, nil); err != nil {
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
		pzID := uuid.UUID{}
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
	result.CommentsImported, result.CommentsNonDeleted, result.Error = svc.insertCommentsForParent(uuid.UUID{}, commentParentIDMap, countsPerPage)

	// Increase comment count on the domain, ignoring errors
	_ = TheDomainService.IncrementCounts(&domain.ID, result.CommentsNonDeleted, 0)

	// Increase comment counts on all pages
	for pageID, pc := range countsPerPage {
		if pc > 0 {
			_ = ThePageService.IncrementCounts(&pageID, pc, 0)
		}
	}

	// Done
	return result
}

func (svc *importExportService) importV1(curUser *data.User, domain *data.Domain, buf []byte) *ImportResult {
	// Unmarshal the data
	var exp comentarioExportV1
	if err := json.Unmarshal(buf, &exp); err != nil {
		logger.Errorf("importExportService.importV1: json.Unmarshal() failed: %v", err)
		return importError(err)
	}

	result := &ImportResult{}

	// Create a map of commenterHex -> user ID
	commenterIDMap := map[HexIDV1]uuid.UUID{
		AnonymousCommenterHexIDV1: data.AnonymousUser.ID,
		"anonymous":               data.AnonymousUser.ID, // A special ugly case for the "anonymous" commenter in Commento
	}
	for _, commenter := range exp.Commenters {
		result.UsersTotal++

		// Try to find an existing user with the same email
		var user *data.User
		if u, err := TheUserService.FindUserByEmail(commenter.Email, false); err == nil {
			// User already exists
			user = u

			// Check if domain user exists, too
			if _, _, err := TheDomainService.FindDomainUserByID(&domain.ID, &u.ID); err == nil {
				// Add the commenter's hex-to-ID mapping
				commenterIDMap[commenter.CommenterHex] = user.ID

				// Proceed to the next record
				continue

			} else if !errors.Is(err, ErrNotFound) {
				// Any other error than "not found"
				return result.WithError(err)
			}

		} else if !errors.Is(err, ErrNotFound) {
			// Any other error than "not found"
			return result.WithError(err)
		}

		// Persist a new user instance, if it doesn't exist
		if user == nil {
			user = data.NewUser(commenter.Email, commenter.Name)
			user.CreatedTime = commenter.JoinDate
			user.UserCreated = uuid.NullUUID{UUID: curUser.ID, Valid: true}
			user.
				WithWebsiteURL(commenter.WebsiteURL).
				WithRemarks("Imported from Commento/Comentario")
			if err := TheUserService.Create(user); err != nil {
				return result.WithError(err)
			}
			result.UsersAdded++
		}

		// Add the commenter's hex-to-ID mapping
		commenterIDMap[commenter.CommenterHex] = user.ID

		// Add a domain user as well
		du := &data.DomainUser{
			DomainID:        domain.ID,
			UserID:          user.ID,
			IsModerator:     commenter.IsModerator,
			IsCommenter:     true,
			NotifyReplies:   true,
			NotifyModerator: true,
			CreatedTime:     commenter.JoinDate,
		}
		if err := TheDomainService.UserAdd(du); err != nil {
			return result.WithError(err)
		}
		result.DomainUsersAdded++
	}

	// Prepare a map of comment HexID -> Comment ID (randomly generated)
	commentHexToIDMap := make(map[HexIDV1]uuid.UUID, len(exp.Comments))
	for _, c := range exp.Comments {
		commentHexToIDMap[c.CommentHex] = uuid.New()
	}

	commentParentIDMap := map[uuid.UUID][]*data.Comment{} // Groups comment lists by their parent ID
	pageIDMap := map[string]uuid.UUID{}

	// Iterate over all comments
	for _, comment := range exp.Comments {
		result.CommentsTotal++

		// Find the comment ID (it must exist at this point)
		commentID, ok := commentHexToIDMap[comment.CommentHex]
		if !ok {
			err := fmt.Errorf("failed to map comment Hex (%s) to comment ID", comment.CommentHex)
			logger.Errorf("importExportService.importV1: %v", err)
			return result.WithError(err)
		}

		// Find the comment's author
		uid, ok := commenterIDMap[comment.CommenterHex]
		if !ok {
			err := fmt.Errorf("failed to find mapped commenter (hex=%v)", comment.CommenterHex)
			logger.Errorf("importExportService.importV1: %v", err)
			return result.WithError(err)
		}

		// There seems to be a little confusion about the format: Commento filed the path under "url", whereas
		// Comentario used "path"
		pagePath := comment.Path
		if pagePath == "" {
			pagePath = comment.URL
		}
		pagePath = "/" + strings.TrimPrefix(pagePath, "/")

		// Find the page for the comment based on path
		var pageID uuid.UUID
		if id, ok := pageIDMap[pagePath]; ok {
			pageID = id

			// Page doesn't exist. Find or insert a page with this path
		} else if page, added, err := ThePageService.UpsertByDomainPath(domain, pagePath, nil); err != nil {
			return result.WithError(err)

		} else {
			pageID = page.ID
			pageIDMap[pagePath] = pageID
			result.PagesTotal++

			// If the page was added, increment the page count
			if added {
				result.PagesAdded++
			}
		}

		// Find the parent comment ID. For indexing purposes only, root ID will be represented by a zero UUID. It will
		// also be the fallback, should parent ID not exist in the map
		parentCommentID := uuid.NullUUID{}
		pzID := uuid.UUID{}
		if id, ok := commentHexToIDMap[comment.ParentHex]; ok {
			parentCommentID = uuid.NullUUID{UUID: id, Valid: true}
			pzID = id
		}

		// Create a new comment instance
		del := comment.Deleted || comment.Markdown == "" || comment.Markdown == "[deleted]"
		c := &data.Comment{
			ID:            commentID,
			ParentID:      parentCommentID,
			PageID:        pageID,
			Markdown:      util.If(del, "", comment.Markdown),
			Score:         comment.Score,
			IsApproved:    comment.State == "approved",
			IsPending:     comment.State == "unapproved",
			IsDeleted:     del,
			CreatedTime:   comment.CreationDate,
			ModeratedTime: sql.NullTime{Time: comment.CreationDate, Valid: true},
			UserCreated:   uuid.NullUUID{UUID: uid, Valid: true},
			UserModerated: uuid.NullUUID{UUID: curUser.ID, Valid: true},
		}

		// Render Markdown into HTML (the latter doesn't get exported)
		if !del {
			c.HTML = util.MarkdownToHTML(
				comment.Markdown,
				TheDynConfigService.GetBool(data.ConfigKeyMarkdownLinksEnabled, false),
				TheDynConfigService.GetBool(data.ConfigKeyMarkdownImagesEnabled, false))
		}

		// File it under the appropriate parent ID
		if l, ok := commentParentIDMap[pzID]; ok {
			commentParentIDMap[pzID] = append(l, c)
		} else {
			commentParentIDMap[pzID] = []*data.Comment{c}
		}
	}

	// Recurse the comment tree (map) to insert the comments in the right order (parents-to-children), starting with the
	// root (= zero UUID)
	countsPerPage := map[uuid.UUID]int{}
	result.CommentsImported, result.CommentsNonDeleted, result.Error = svc.insertCommentsForParent(uuid.UUID{}, commentParentIDMap, countsPerPage)

	// Increase comment count on the domain, ignoring errors
	_ = TheDomainService.IncrementCounts(&domain.ID, result.CommentsNonDeleted, 0)

	// Increase comment counts on all pages
	for pageID, pc := range countsPerPage {
		if pc > 0 {
			_ = ThePageService.IncrementCounts(&pageID, pc, 0)
		}
	}

	// Succeeded
	return result
}

func (svc *importExportService) importV3(curUser *data.User, domain *data.Domain, buf []byte) *ImportResult {
	// Unmarshal the data
	var exp comentarioExportV3
	if err := json.Unmarshal(buf, &exp); err != nil {
		logger.Errorf("importExportService.importV3: json.Unmarshal() failed: %v", err)
		return importError(err)
	}

	result := &ImportResult{}

	// Create a map of user IDs
	commenterIDMap := map[strfmt.UUID]uuid.UUID{
		strfmt.UUID(data.AnonymousUser.ID.String()): data.AnonymousUser.ID,
	}
	for _, commenter := range exp.Commenters {
		result.UsersTotal++

		// Try to find an existing user with the same email
		var user *data.User
		if u, err := TheUserService.FindUserByEmail(string(commenter.Email), false); err == nil {
			// User already exists
			user = u

			// Check if domain user exists, too
			if _, _, err := TheDomainService.FindDomainUserByID(&domain.ID, &u.ID); err == nil {
				// Add an ID mapping
				commenterIDMap[commenter.ID] = user.ID

				// Proceed to the next record
				continue

			} else if !errors.Is(err, ErrNotFound) {
				// Any other error than "not found"
				return result.WithError(err)
			}

		} else if !errors.Is(err, ErrNotFound) {
			// Any other error than "not found"
			return result.WithError(err)
		}

		// Persist a new user instance, if it doesn't exist
		if user == nil {
			user = data.NewUser(string(commenter.Email), commenter.Name)
			user.CreatedTime = time.Time(commenter.CreatedTime)
			user.UserCreated = uuid.NullUUID{UUID: curUser.ID, Valid: true}
			user.
				WithFederated("", string(commenter.FederatedIDP)).
				WithWebsiteURL(string(commenter.WebsiteURL)).
				WithRemarks("Imported from Comentario V3")
			if err := TheUserService.Create(user); err != nil {
				return result.WithError(err)
			}
			result.UsersAdded++
		}

		// Add an ID mapping
		commenterIDMap[commenter.ID] = user.ID

		// Add a domain user as well
		du := &data.DomainUser{
			DomainID:        domain.ID,
			UserID:          user.ID,
			IsModerator:     commenter.IsModerator,
			IsCommenter:     true,
			NotifyReplies:   true,
			NotifyModerator: true,
			CreatedTime:     time.Time(commenter.CreatedTime),
		}
		if err := TheDomainService.UserAdd(du); err != nil {
			return result.WithError(err)
		}
		result.DomainUsersAdded++
	}

	// Create a map of page IDs
	pageIDMap := make(map[strfmt.UUID]uuid.UUID, len(exp.Pages))
	for _, page := range exp.Pages {
		result.PagesTotal++

		// Find the page for the comment based on path
		p, added, err := ThePageService.UpsertByDomainPath(domain, string(page.Path), nil)
		if err != nil {
			return result.WithError(err)

		}

		// Store the ID mapping
		pageIDMap[page.ID] = p.ID

		// If the page was added, increment the page count
		if added {
			result.PagesAdded++
		}
	}

	// Prepare a map of comment IDs (randomly generated)
	commentIDMap := make(map[strfmt.UUID]uuid.UUID, len(exp.Comments))
	for _, c := range exp.Comments {
		commentIDMap[c.ID] = uuid.New()
	}

	// Create a map that groups comment lists by their parent ID
	commentParentIDMap := map[uuid.UUID][]*data.Comment{}

	// Iterate over all comments
	for _, comment := range exp.Comments {
		result.CommentsTotal++

		// Find the comment ID (it must exist at this point)
		commentID, ok := commentIDMap[comment.ID]
		if !ok {
			err := fmt.Errorf("failed to map comment with ID=%s", comment.ID)
			logger.Errorf("importExportService.importV3: %v", err)
			return result.WithError(err)
		}

		// Find the comment's author
		uid, ok := commenterIDMap[comment.UserCreated]
		if !ok {
			err := fmt.Errorf("failed to map commenter with ID=%s", comment.UserCreated)
			logger.Errorf("importExportService.importV3: %v", err)
			return result.WithError(err)
		}

		// Find the comment's page ID
		pageID, ok := pageIDMap[comment.PageID]
		if !ok {
			err := fmt.Errorf("failed to map page with ID=%s", comment.PageID)
			logger.Errorf("importExportService.importV3: %v", err)
			return result.WithError(err)
		}

		// Find the parent comment ID. For indexing purposes only, root ID will be represented by a zero UUID. It will
		// also be the fallback, should parent ID not exist in the map
		parentCommentID := uuid.NullUUID{}
		pzID := uuid.UUID{}
		if id, ok := commentIDMap[comment.ParentID]; ok {
			parentCommentID = uuid.NullUUID{UUID: id, Valid: true}
			pzID = id
		}

		// Try to map users who moderated/deleted the comment
		var umID, udID uuid.NullUUID
		umID.UUID, umID.Valid = commenterIDMap[comment.UserModerated]
		udID.UUID, udID.Valid = commenterIDMap[comment.UserDeleted]

		// Create a new comment instance
		c := &data.Comment{
			ID:            commentID,
			ParentID:      parentCommentID,
			PageID:        pageID,
			Markdown:      util.If(comment.IsDeleted, "", comment.Markdown),
			HTML:          comment.HTML,
			Score:         int(comment.Score),
			IsSticky:      comment.IsSticky,
			IsApproved:    comment.IsApproved,
			IsPending:     comment.IsPending,
			IsDeleted:     comment.IsDeleted,
			CreatedTime:   time.Time(comment.CreatedTime),
			ModeratedTime: data.ToNullDateTime(comment.ModeratedTime),
			DeletedTime:   data.ToNullDateTime(comment.DeletedTime),
			UserCreated:   uuid.NullUUID{UUID: uid, Valid: true},
			UserModerated: umID,
			UserDeleted:   udID,
		}

		// File it under the appropriate parent ID
		if l, ok := commentParentIDMap[pzID]; ok {
			commentParentIDMap[pzID] = append(l, c)
		} else {
			commentParentIDMap[pzID] = []*data.Comment{c}
		}
	}

	// Recurse the comment tree (map) to insert the comments in the right order (parents-to-children), starting with the
	// root (= zero UUID)
	countsPerPage := map[uuid.UUID]int{}
	result.CommentsImported, result.CommentsNonDeleted, result.Error = svc.insertCommentsForParent(uuid.UUID{}, commentParentIDMap, countsPerPage)

	// Increase comment count on the domain, ignoring errors
	_ = TheDomainService.IncrementCounts(&domain.ID, result.CommentsNonDeleted, 0)

	// Increase comment counts on all pages
	for pageID, pc := range countsPerPage {
		if pc > 0 {
			_ = ThePageService.IncrementCounts(&pageID, pc, 0)
		}
	}

	// Succeeded
	return result
}

// insertCommentsForParent inserts those comments from the map that have the specified parent ID, returning the number
// of successfully inserted and non-deleted comments
func (svc *importExportService) insertCommentsForParent(parentID uuid.UUID, commentParentMap map[uuid.UUID][]*data.Comment, countsPerPage map[uuid.UUID]int) (countImported, countNonDeleted int, err error) {
	for _, c := range commentParentMap[parentID] {
		// Insert the comment
		if err = TheCommentService.Create(c); err != nil {
			return
		}
		countImported++
		if !c.IsDeleted {
			countNonDeleted++
			countsPerPage[c.PageID] = countsPerPage[c.PageID] + 1
		}

		// Insert any children of the comment
		var cci, ccnd int
		if cci, ccnd, err = svc.insertCommentsForParent(c.ID, commentParentMap, countsPerPage); err != nil {
			return
		}
		countImported += cci
		countNonDeleted += ccnd
	}
	return
}
