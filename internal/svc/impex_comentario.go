package svc

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/go-openapi/strfmt"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"strings"
	"time"
)

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

func comentarioExport(domainID *uuid.UUID) ([]byte, error) {
	// Create an export data object
	exp := comentarioExportV3{Version: 3}

	// Fetch pages
	if ps, err := Services.PageService(nil).ListByDomain(domainID); err != nil {
		return nil, err
	} else {
		exp.Pages = data.SliceToDTOs[*data.DomainPage, *models.DomainPage](ps)
	}

	// Fetch comments
	if cs, err := Services.CommentService(nil).ListByDomain(domainID); err != nil {
		return nil, err
	} else {
		exp.Comments = cs
	}

	// Fetch commenters
	if um, dus, err := Services.UserService(nil).ListByDomain(domainID, false, "", "", data.SortAsc, -1); err != nil {
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
		logger.Errorf("comentarioExport/Marshal: %v", err)
		return nil, err
	}

	// Compress the JSON data with Gzip
	gzippedData, err := util.CompressGzip(jsonData)
	if err != nil {
		logger.Errorf("comentarioExport/CompressGzip: %v", err)
		return nil, err
	}

	// Succeeded
	return gzippedData, nil
}

func comentarioImport(curUser *data.User, domain *data.Domain, buf []byte) *ImportResult {
	// Unmarshal the metadata to determine the format version
	var exp comentarioExportMeta
	if err := json.Unmarshal(buf, &exp); err != nil {
		logger.Errorf("comentarioImport/Unmarshal: %v", err)
		return importError(err)
	}
	logger.Debugf("Comentario export version: %d", exp.Version)

	switch exp.Version {
	case 1:
		return comentarioImportV1(curUser, domain, buf)

	case 3:
		return comentarioImportV3(curUser, domain, buf)

	default:
		// Unrecognised version
		err := fmt.Errorf("invalid Comentario export version (%d)", exp.Version)
		logger.Errorf("comentarioImport: %v", err)
		return importError(err)
	}
}

func comentarioImportV1(curUser *data.User, domain *data.Domain, buf []byte) *ImportResult {
	// Unmarshal the data
	var exp comentarioExportV1
	if err := json.Unmarshal(buf, &exp); err != nil {
		logger.Errorf("comentarioImportV1/Unmarshal: %v", err)
		return importError(err)
	}

	result := &ImportResult{}

	// Fetch domain config
	maxLength := Services.DomainConfigService(nil).GetInt(&domain.ID, data.DomainConfigKeyMaxCommentLength)
	logger.Debugf("Max. comment text length is %d", maxLength)

	// Create a map of commenterHex -> user ID
	commenterIDMap := map[HexIDV1]uuid.UUID{
		AnonymousCommenterHexIDV1: data.AnonymousUser.ID,
		"anonymous":               data.AnonymousUser.ID, // A special ugly case for the "anonymous" commenter in Commento
	}
	for _, commenter := range exp.Commenters {
		result.UsersTotal++

		// Import the user and domain user
		var user *data.User
		if u, userAdded, domainUserAdded, err := importUserByEmail(
			commenter.Email,
			"", // Local auth only
			commenter.Name,
			commenter.WebsiteURL,
			"Imported from Commento/Comentario",
			true,
			false, // No SSO flag support in the export
			&curUser.ID,
			&domain.ID,
			commenter.JoinDate,
		); err != nil {
			return result.WithError(err)
		} else {
			user = u

			// Increment user counters
			if userAdded {
				result.UsersAdded++
			}
			if domainUserAdded {
				result.DomainUsersAdded++
			}
		}

		// Add the commenter's hex-to-ID mapping
		commenterIDMap[commenter.CommenterHex] = user.ID
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
			logger.Errorf("comentarioImportV1: %v", err)
			return result.WithError(err)
		}

		// Find the comment's author
		uid, ok := commenterIDMap[comment.CommenterHex]
		if !ok {
			err := fmt.Errorf("failed to find mapped commenter (hex=%v)", comment.CommenterHex)
			logger.Errorf("comentarioImportV1: %v", err)
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
		} else if page, added, err := Services.PageService(nil).UpsertByDomainPath(domain, pagePath, "", nil); err != nil {
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
		pzID := util.ZeroUUID
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
			// Truncate comment text to avoid errors
			if err := Services.CommentService(nil).SetMarkdown(c, util.TruncateStr(comment.Markdown, maxLength), &domain.ID, nil); err != nil {
				return result.WithError(err)
			}
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
	result.CommentsImported, result.CommentsNonDeleted, result.Error = insertCommentsForParent(util.ZeroUUID, commentParentIDMap, countsPerPage)

	// Increase comment count on the domain, ignoring errors
	_ = Services.DomainService(nil).IncrementCounts(&domain.ID, result.CommentsNonDeleted, 0)

	// Increase comment counts on all pages
	for pageID, pc := range countsPerPage {
		if pc > 0 {
			_ = Services.PageService(nil).IncrementCounts(&pageID, pc, 0)
		}
	}

	// Succeeded
	return result
}

func comentarioImportV3(curUser *data.User, domain *data.Domain, buf []byte) *ImportResult {
	// Unmarshal the data
	var exp comentarioExportV3
	if err := json.Unmarshal(buf, &exp); err != nil {
		logger.Errorf("comentarioImportV3/Unmarshal: %v", err)
		return importError(err)
	}

	result := &ImportResult{}

	// Create a map of user IDs
	commenterIDMap := map[strfmt.UUID]uuid.UUID{
		strfmt.UUID(data.AnonymousUser.ID.String()): data.AnonymousUser.ID,
	}
	for _, commenter := range exp.Commenters {
		result.UsersTotal++

		// Import the user and domain user
		var user *data.User
		if u, userAdded, domainUserAdded, err := importUserByEmail(
			string(commenter.Email),
			string(commenter.FederatedIDP),
			commenter.Name,
			string(commenter.WebsiteURL),
			"Imported from Comentario V3",
			true,
			commenter.FederatedSso,
			&curUser.ID,
			&domain.ID,
			time.Time(commenter.CreatedTime),
		); err != nil {
			return result.WithError(err)
		} else {
			user = u

			// Increment user counters
			if userAdded {
				result.UsersAdded++
			}
			if domainUserAdded {
				result.DomainUsersAdded++
			}
		}

		// Add the commenter's hex-to-ID mapping
		commenterIDMap[commenter.ID] = user.ID
	}

	// Create a map of page IDs
	pageIDMap := make(map[strfmt.UUID]uuid.UUID, len(exp.Pages))
	for _, page := range exp.Pages {
		result.PagesTotal++

		// Find the page for the comment based on path
		p, added, err := Services.PageService(nil).UpsertByDomainPath(domain, string(page.Path), page.Title, nil)
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
			logger.Errorf("comentarioImportV3: %v", err)
			return result.WithError(err)
		}

		// Find the comment's author
		uid, ok := commenterIDMap[comment.UserCreated]
		if !ok {
			err := fmt.Errorf("failed to map commenter with ID=%s", comment.UserCreated)
			logger.Errorf("comentarioImportV3: %v", err)
			return result.WithError(err)
		}

		// Find the comment's page ID
		pageID, ok := pageIDMap[comment.PageID]
		if !ok {
			err := fmt.Errorf("failed to map page with ID=%s", comment.PageID)
			logger.Errorf("comentarioImportV3: %v", err)
			return result.WithError(err)
		}

		// Find the parent comment ID. For indexing purposes only, root ID will be represented by a zero UUID. It will
		// also be the fallback, should parent ID not exist in the map
		parentCommentID := uuid.NullUUID{}
		pzID := util.ZeroUUID
		if id, ok := commentIDMap[comment.ParentID]; ok {
			parentCommentID = uuid.NullUUID{UUID: id, Valid: true}
			pzID = id
		}

		// Try to map users who moderated/deleted/edited the comment
		var umID, udID, ueID uuid.NullUUID
		umID.UUID, umID.Valid = commenterIDMap[comment.UserModerated]
		udID.UUID, udID.Valid = commenterIDMap[comment.UserDeleted]
		ueID.UUID, ueID.Valid = commenterIDMap[comment.UserEdited]

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
			UserEdited:    ueID,
			AuthorName:    comment.AuthorName,
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
	result.CommentsImported, result.CommentsNonDeleted, result.Error = insertCommentsForParent(util.ZeroUUID, commentParentIDMap, countsPerPage)

	// Increase comment count on the domain, ignoring errors
	_ = Services.DomainService(nil).IncrementCounts(&domain.ID, result.CommentsNonDeleted, 0)

	// Increase comment counts on all pages
	for pageID, pc := range countsPerPage {
		if pc > 0 {
			_ = Services.PageService(nil).IncrementCounts(&pageID, pc, 0)
		}
	}

	// Succeeded
	return result
}
