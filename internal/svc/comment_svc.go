package svc

import (
	"database/sql"
	"github.com/doug-martin/goqu/v9"
	"github.com/doug-martin/goqu/v9/exp"
	"github.com/go-openapi/strfmt"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"strings"
	"time"
)

// TheCommentService is a global CommentService implementation
var TheCommentService CommentService = &commentService{}

// CommentService is a service interface for dealing with comments
type CommentService interface {
	// Count returns number of comments for the given domain and, optionally, page.
	//   - curUser is the current authenticated/anonymous user.
	//   - curDomainUser is the current domain user (can be nil).
	//   - domainID is the mandatory domain ID.
	//   - pageID is an optional page ID to filter the result by.
	//   - userID is an optional user ID to filter the result by.
	//   - inclApproved indicates whether to include approved comments.
	//   - inclPending indicates whether to include comments pending moderation.
	//   - inclRejected indicates whether to include rejected comments.
	//   - inclDeleted indicates whether to include deleted comments.
	Count(
		curUser *data.User, curDomainUser *data.DomainUser, domainID, pageID, userID *uuid.UUID,
		inclApproved, inclPending, inclRejected, inclDeleted bool) (int64, error)
	// Create creates, persists, and returns a new comment
	Create(comment *data.Comment) error
	// DeleteByUser permanently deletes all comments by the specified user, returning the affected comment count
	DeleteByUser(userID *uuid.UUID) (int64, error)
	// Edited persists the text changes of the given comment in the database
	Edited(comment *data.Comment) error
	// FindByID finds and returns a comment with the given ID
	FindByID(id *uuid.UUID) (*data.Comment, error)
	// ListByDomain returns a list of comments for the given domain. No comment property filtering is applied, so
	// minimum access privileges are domain moderator
	ListByDomain(domainID *uuid.UUID) ([]*models.Comment, error)
	// ListWithCommentersByDomainPage returns a list of comments and related commenters for the given domain and,
	// optionally, page.
	//   - curUser is the current authenticated/anonymous user.
	//   - curDomainUser is the current domain user (can be nil).
	//   - domainID is the mandatory domain ID.
	//   - pageID is an optional page ID to filter the result by.
	//   - userID is an optional user ID to filter the result by.
	//   - inclApproved indicates whether to include approved comments.
	//   - inclPending indicates whether to include comments pending moderation.
	//   - inclRejected indicates whether to include rejected comments.
	//   - inclDeleted indicates whether to include deleted comments.
	//   - removeOrphans indicates whether to filter out non-root comments not having a parent comment on the same list,
	//     recursively, ensuring a coherent tree structure. NB: should be used with care in conjunction with a positive
	//     pageIndex or filter string (as they limit the result set).
	//   - filter is an optional substring to filter the result by.
	//   - sortBy is an optional property name to sort the result by. If empty, sorts by the path.
	//   - dir is the sort direction.
	//   - pageIndex is the page index, if negative, no pagination is applied.
	ListWithCommentersByDomainPage(
		curUser *data.User, curDomainUser *data.DomainUser, domainID, pageID, userID *uuid.UUID,
		inclApproved, inclPending, inclRejected, inclDeleted, removeOrphans bool, filter, sortBy string, dir data.SortDirection,
		pageIndex int) ([]*models.Comment, []*models.Commenter, error)
	// MarkDeleted marks a comment with the given ID deleted by the given user
	MarkDeleted(commentID, userID *uuid.UUID) error
	// MarkDeletedByUser deletes all comments by the specified user, returning the affected comment count
	MarkDeletedByUser(curUserID, userID *uuid.UUID) (int64, error)
	// Moderated persists the moderation status changes of the given comment in the database
	Moderated(comment *data.Comment) error
	// SetMarkdown updates the Markdown/HTML properties of the given comment in the specified domain. editedUserID
	// should point to the user who edited the comment in case it's edited, otherwise nil
	SetMarkdown(comment *data.Comment, markdown string, domainID, editedUserID *uuid.UUID)
	// UpdateSticky updates the stickiness flag of a comment with the given ID in the database
	UpdateSticky(commentID *uuid.UUID, sticky bool) error
	// Vote sets a vote for the given comment and user and updates the comment, return the updated comment's score
	Vote(commentID, userID *uuid.UUID, direction int8) (int, error)
}

//----------------------------------------------------------------------------------------------------------------------

// commentService is a blueprint CommentService implementation
type commentService struct{}

func (svc *commentService) Count(
	curUser *data.User, curDomainUser *data.DomainUser, domainID, pageID, userID *uuid.UUID,
	inclApproved, inclPending, inclRejected, inclDeleted bool) (int64, error) {
	logger.Debugf(
		"commentService.Count(%s, %#v, %s, %s, %s, %v, %v, %v, %v)",
		&curUser.ID, curDomainUser, domainID, pageID, userID, inclApproved, inclPending, inclRejected, inclDeleted)

	// Prepare a query
	q := db.From(goqu.T("cm_comments").As("c")).
		Join(goqu.T("cm_domain_pages").As("p"), goqu.On(goqu.Ex{"p.id": goqu.I("c.page_id")})).
		Where(goqu.Ex{"p.domain_id": domainID})

	// If there's a page ID specified, include only comments for that page (otherwise  comments for all pages of the
	// domain will be included)
	if pageID != nil {
		q = q.Where(goqu.Ex{"c.page_id": pageID})
	}

	// If there's a user ID specified, include only comments by that user
	if userID != nil {
		q = q.Where(goqu.Ex{"c.user_created": userID})
	}

	// Add status filter
	if !inclApproved {
		q = q.Where(goqu.ExOr{"c.is_pending": true, "c.is_approved": false})
	}
	if !inclPending {
		q = q.Where(goqu.Ex{"c.is_pending": false})
	}
	if !inclRejected {
		q = q.Where(goqu.ExOr{"c.is_pending": true, "c.is_approved": true})
	}
	if !inclDeleted {
		q = q.Where(goqu.Ex{"c.is_deleted": false})
	}

	// Add authorship filter. If anonymous user: only include approved
	if curUser.IsAnonymous() {
		q = q.Where(goqu.Ex{"c.is_pending": false, "c.is_approved": true})

	} else if !curUser.IsSuperuser && !curDomainUser.CanModerate() {
		// Authenticated, non-moderator user: show others' comments only if they are approved
		q = q.Where(goqu.Or(
			goqu.Ex{"c.is_pending": false, "c.is_approved": true},
			goqu.Ex{"c.user_created": &curUser.ID}))
	}

	cnt, err := q.Count()
	if err != nil {
		logger.Errorf("commentService.Count: Count() failed: %v", err)
		return 0, translateDBErrors(err)
	}

	// Succeeded
	return cnt, nil
}

func (svc *commentService) Create(c *data.Comment) error {
	logger.Debugf("commentService.Create(%#v)", c)

	// Insert a record into the database
	if err := db.ExecuteOne(
		db.Dialect().
			Insert("cm_comments").
			Rows(goqu.Record{
				"id":             &c.ID,
				"parent_id":      &c.ParentID,
				"page_id":        c.PageID,
				"markdown":       c.Markdown,
				"html":           c.HTML,
				"score":          c.Score,
				"is_sticky":      c.IsSticky,
				"is_approved":    c.IsApproved,
				"is_pending":     c.IsPending,
				"is_deleted":     c.IsDeleted,
				"ts_created":     c.CreatedTime,
				"ts_moderated":   c.ModeratedTime,
				"ts_deleted":     c.DeletedTime,
				"ts_edited":      c.EditedTime,
				"user_created":   &c.UserCreated,
				"user_moderated": &c.UserModerated,
				"user_deleted":   &c.UserDeleted,
				"user_edited":    &c.UserEdited,
				"pending_reason": util.TruncateStr(c.PendingReason, data.MaxPendingReasonLength),
				"author_name":    c.AuthorName,
				"author_ip":      config.MaskIP(c.AuthorIP),
				"author_country": c.AuthorCountry,
			}),
	); err != nil {
		logger.Errorf("commentService.Create: ExecuteOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) DeleteByUser(userID *uuid.UUID) (int64, error) {
	logger.Debugf("commentService.DeleteByUser(%s)", userID)

	// Purge all comments created by the user. This will also remove all child comments thanks to the foreign key
	if res, err := db.ExecuteRes(db.Dialect().Delete("cm_comments").Where(goqu.Ex{"user_created": userID})); err != nil {
		logger.Errorf("userService.DeleteUserByID: ExecuteOne() failed for purging comments: %v", err)
		return 0, err
	} else if cnt, err := res.RowsAffected(); err != nil {
		logger.Errorf("userService.DeleteUserByID: RowsAffected() failed: %v", err)
		return 0, err
	} else {
		// Succeeded
		return cnt, nil
	}
}

func (svc *commentService) Edited(comment *data.Comment) error {
	logger.Debugf("commentService.Edited(%#v)", comment)

	// Update the row in the database
	if err := db.ExecuteOne(
		db.Dialect().
			Update("cm_comments").
			Set(goqu.Record{
				"markdown":    comment.Markdown,
				"html":        comment.HTML,
				"ts_edited":   comment.EditedTime,
				"user_edited": comment.UserEdited,
			}).
			Where(goqu.Ex{"id": &comment.ID}),
	); err != nil {
		logger.Errorf("commentService.Edited: ExecuteOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) FindByID(id *uuid.UUID) (*data.Comment, error) {
	logger.Debugf("commentService.FindByID(%s)", id)

	// Query the database
	var c data.Comment
	if b, err := db.From("cm_comments").Where(goqu.Ex{"id": id}).ScanStruct(&c); err != nil {
		logger.Errorf("commentService.FindByID: ScanStruct() failed: %v", err)
		return nil, translateDBErrors(err)
	} else if !b {
		return nil, ErrNotFound
	}

	// Succeeded
	return &c, nil
}

func (svc *commentService) ListByDomain(domainID *uuid.UUID) ([]*models.Comment, error) {
	logger.Debugf("commentService.ListByDomain(%s)", domainID)

	// Prepare a query
	q := db.From(goqu.T("cm_comments").As("c")).
		Select("c.*", "p.path", "d.host", "d.is_https").
		// Join comment pages
		Join(goqu.T("cm_domain_pages").As("p"), goqu.On(goqu.Ex{"p.id": goqu.I("c.page_id")})).
		// Join domain
		Join(goqu.T("cm_domains").As("d"), goqu.On(goqu.Ex{"d.id": goqu.I("p.domain_id")})).
		// Filter by page domain
		Where(goqu.Ex{"p.domain_id": domainID})

	// Fetch the comments
	var dbRecs []struct {
		data.Comment
		PagePath    string `db:"path"`
		DomainHost  string `db:"host"`
		DomainHTTPS bool   `db:"is_https"`
	}
	if err := q.ScanStructs(&dbRecs); err != nil {
		logger.Errorf("commentService.ListByDomain: ScanStructs() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Convert models into DTOs
	var comments []*models.Comment
	for _, r := range dbRecs {
		comments = append(comments, r.Comment.ToDTO(r.DomainHTTPS, r.DomainHost, r.PagePath))
	}

	// Succeeded
	return comments, nil
}

func (svc *commentService) ListWithCommentersByDomainPage(curUser *data.User, curDomainUser *data.DomainUser,
	domainID, pageID, userID *uuid.UUID, inclApproved, inclPending, inclRejected, inclDeleted, removeOrphans bool,
	filter, sortBy string, dir data.SortDirection, pageIndex int,
) ([]*models.Comment, []*models.Commenter, error) {
	logger.Debugf(
		"commentService.ListWithCommentersByDomainPage(%s, %#v, %s, %s, %s, %v, %v, %v, %v, %v, %q, '%s', %s, %d)",
		&curUser.ID, curDomainUser, domainID, pageID, userID, inclApproved, inclPending, inclRejected, inclDeleted,
		removeOrphans, filter, sortBy, dir, pageIndex)

	// Prepare a query
	q := db.From(goqu.T("cm_comments").As("c")).
		Select(
			// Comment fields
			"c.*",
			// Commenter fields
			goqu.I("u.id").As("u_id"),
			goqu.I("u.email").As("u_email"),
			goqu.I("u.name").As("u_name"),
			goqu.I("u.website_url").As("u_website_url"),
			goqu.I("u.is_superuser").As("u_is_superuser"),
			goqu.I("du.is_owner").As("du_is_owner"),
			goqu.I("du.is_moderator").As("du_is_moderator"),
			goqu.I("du.is_commenter").As("du_is_commenter"),
			// Avatar fields
			goqu.I("a.user_id").As("a_user_id"),
			// Votes fields
			goqu.I("v.negative").As("v_negative"),
			// Page fields
			goqu.I("p.path").As("p_path"),
			// Domain fields
			goqu.I("d.host").As("d_host"),
			goqu.I("d.is_https").As("d_is_https")).
		// Join comment pages
		Join(goqu.T("cm_domain_pages").As("p"), goqu.On(goqu.Ex{"p.id": goqu.I("c.page_id")})).
		// Join domain
		Join(goqu.T("cm_domains").As("d"), goqu.On(goqu.Ex{"d.id": goqu.I("p.domain_id")})).
		// Outer-join commenter users
		LeftJoin(goqu.T("cm_users").As("u"), goqu.On(goqu.Ex{"u.id": goqu.I("c.user_created")})).
		// Outer-join domain users
		LeftJoin(goqu.T("cm_domains_users").As("du"), goqu.On(goqu.Ex{"du.user_id": goqu.I("c.user_created"), "du.domain_id": goqu.I("p.domain_id")})).
		// Outer-join user avatars
		LeftJoin(goqu.T("cm_user_avatars").As("a"), goqu.On(goqu.Ex{"a.user_id": goqu.I("c.user_created")})).
		// Outer-join comment votes
		LeftJoin(goqu.T("cm_comment_votes").As("v"), goqu.On(goqu.Ex{"v.comment_id": goqu.I("c.id"), "v.user_id": &curUser.ID})).
		// Filter by page domain
		Where(goqu.Ex{"p.domain_id": domainID})

	// If there's a page ID specified, include only comments for that page (otherwise  comments for all pages of the
	// domain will be included)
	if pageID != nil {
		q = q.Where(goqu.Ex{"c.page_id": pageID})
	}

	// If there's a user ID specified, include only comments by that user
	if userID != nil {
		q = q.Where(goqu.Ex{"c.user_created": userID})
	}

	// Add status filter
	if !inclApproved {
		q = q.Where(goqu.ExOr{"c.is_pending": true, "c.is_approved": false})
	}
	if !inclPending {
		q = q.Where(goqu.Ex{"c.is_pending": false})
	}
	if !inclRejected {
		q = q.Where(goqu.ExOr{"c.is_pending": true, "c.is_approved": true})
	}
	if !inclDeleted {
		q = q.Where(goqu.Ex{"c.is_deleted": false})
	}

	// Add authorship filter. If anonymous user: only include approved
	if curUser.IsAnonymous() {
		q = q.Where(goqu.Ex{"c.is_pending": false, "c.is_approved": true})

	} else if !curUser.IsSuperuser && !curDomainUser.CanModerate() {
		// Authenticated, non-moderator user: show others' comments only if they are approved
		q = q.Where(goqu.Or(
			goqu.Ex{"c.is_pending": false, "c.is_approved": true},
			goqu.Ex{"c.user_created": &curUser.ID}))
	}

	// Add substring filter
	if filter != "" {
		pattern := "%" + strings.ToLower(filter) + "%"
		e := []exp.Expression{
			goqu.L(`lower("c"."markdown")`).Like(pattern),
			goqu.L(`lower("u"."name")`).Like(pattern),
		}
		// Email is only searchable by superusers and owners
		if curUser.IsSuperuser || curDomainUser.CanModerate() {
			e = append(e, goqu.L(`lower("u"."email")`).Like(pattern))
		}
		q = q.Where(goqu.Or(e...))
	}

	// Configure sorting
	sortIdent := "c.ts_created"
	switch sortBy {
	case "score":
		sortIdent = "c.score"
	}
	q = q.Order(
		dir.ToOrderedExpression(sortIdent),
		goqu.I("c.id").Asc(), // Always add ID for stable ordering
	)

	// Paginate if required
	if pageIndex >= 0 {
		q = q.Limit(util.ResultPageSize).Offset(uint(pageIndex) * util.ResultPageSize)
	}

	// Fetch the comments
	var dbRecs []struct {
		data.Comment
		UserID          uuid.NullUUID  `db:"u_id"`
		UserEmail       sql.NullString `db:"u_email"`
		UserName        sql.NullString `db:"u_name"`
		UserWebsiteUrl  sql.NullString `db:"u_website_url"`
		UserIsSuperuser sql.NullBool   `db:"u_is_superuser"`
		UserIsOwner     sql.NullBool   `db:"du_is_owner"`
		UserIsModerator sql.NullBool   `db:"du_is_moderator"`
		UserIsCommenter sql.NullBool   `db:"du_is_commenter"`
		AvatarID        uuid.NullUUID  `db:"a_user_id"`
		VoteNegative    sql.NullBool   `db:"v_negative"`
		PagePath        string         `db:"p_path"`
		DomainHost      string         `db:"d_host"`
		DomainHTTPS     bool           `db:"d_is_https"`
	}
	if err := q.ScanStructs(&dbRecs); err != nil {
		logger.Errorf("commentService.ListWithCommentersByDomainPage: ScanStructs() failed: %v", err)
		return nil, nil, translateDBErrors(err)
	}

	// Prepare commenter map: begin with only the "anonymous" one
	commenterMap := map[uuid.UUID]*models.Commenter{data.AnonymousUser.ID: data.AnonymousUser.ToCommenter(true, false)}

	// Iterate result rows
	var comments []*models.Comment
	commentMap := make(map[strfmt.UUID]bool)
	for _, r := range dbRecs {
		// Convert the comment, applying the required access privileges
		cm := r.Comment.
			CloneWithClearance(curUser, curDomainUser).
			ToDTO(r.DomainHTTPS, r.DomainHost, r.PagePath)

		// If the user exists and isn't anonymous
		if r.UserID.Valid && r.UserID.UUID != data.AnonymousUser.ID {
			// If the commenter isn't present in the map yet
			if _, ok := commenterMap[r.UserID.UUID]; !ok {
				u := data.User{
					ID:          r.UserID.UUID,
					Email:       r.UserEmail.String,
					Name:        r.UserName.String,
					IsSuperuser: r.UserIsSuperuser.Valid && r.UserIsSuperuser.Bool,
					WebsiteURL:  r.UserWebsiteUrl.String,
					HasAvatar:   r.AvatarID.Valid,
				}

				// Calculate commenter roles
				uIsOwner := u.IsSuperuser || r.UserIsOwner.Valid && r.UserIsOwner.Bool
				uIsModerator := uIsOwner || r.UserIsModerator.Valid && r.UserIsModerator.Bool

				// Convert the user into a commenter and add it to the map
				commenterMap[r.UserID.UUID] = u.
					CloneWithClearance(curUser.IsSuperuser, curDomainUser.IsAnOwner(), curDomainUser.IsAModerator()).
					ToCommenter(uIsModerator || !r.UserIsCommenter.Valid || r.UserIsCommenter.Bool, uIsModerator)
			}
		}

		// Determine comment vote direction for the user
		if r.VoteNegative.Valid {
			if r.VoteNegative.Bool {
				cm.Direction = -1
			} else {
				cm.Direction = 1
			}
		}

		// Append the comment to the list and a flag to the map
		comments = append(comments, cm)
		commentMap[cm.ID] = true
	}

	// Remove orphaned comments, if requested. Also clean up "unused" commenters
	if removeOrphans {
		// Loop until there's no single deletion occurred
		dels := true
		for dels {
			dels = false
			for _, cm := range comments {
				// Skip root comments, already removed comments and those having a parent
				if cm.ParentID != "" && commentMap[cm.ID] && !commentMap[cm.ParentID] {
					delete(commentMap, cm.ID)
					dels = true
				}
			}
		}

		// Copy over what's left, and compile a map of used commenters
		var filteredComments []*models.Comment
		usedCommenters := make(map[strfmt.UUID]bool)
		for _, cm := range comments {
			if commentMap[cm.ID] {
				filteredComments = append(filteredComments, cm)
				usedCommenters[cm.UserCreated] = true
			}
		}

		// Swap out the comments for the filtered list
		comments = filteredComments

		// Remove unused commenters from the map
		for id, cr := range commenterMap {
			if !usedCommenters[cr.ID] {
				delete(commenterMap, id)
			}
		}
	}

	// Convert commenter map into a slice
	var commenters []*models.Commenter
	for _, cr := range commenterMap {
		commenters = append(commenters, cr)
	}

	// Succeeded
	return comments, commenters, nil
}

func (svc *commentService) MarkDeleted(commentID, userID *uuid.UUID) error {
	logger.Debugf("commentService.MarkDeleted(%s, %s)", commentID, userID)

	// Update the record in the database
	if err := db.ExecuteOne(
		db.Dialect().
			Update("cm_comments").
			Set(goqu.Record{
				"is_deleted":     true,
				"markdown":       "",
				"html":           "",
				"pending_reason": "",
				"ts_deleted":     time.Now().UTC(),
				"user_deleted":   userID,
			}).
			Where(goqu.Ex{"id": commentID}),
	); err != nil {
		logger.Errorf("commentService.MarkDeleted: ExecuteOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) MarkDeletedByUser(curUserID, userID *uuid.UUID) (int64, error) {
	logger.Debugf("commentService.MarkDeletedByUser(%s, %s)", curUserID, userID)

	// Delete records from the database
	q := db.Dialect().
		Update("cm_comments").
		Set(goqu.Record{
			"is_deleted":     true,
			"markdown":       "",
			"html":           "",
			"pending_reason": "",
			"ts_deleted":     time.Now().UTC(),
			"user_deleted":   curUserID,
		}).
		Where(goqu.Ex{"user_created": userID})

	if res, err := db.ExecuteRes(q); err != nil {
		logger.Errorf("commentService.MarkDeletedByUser: ExecuteRes() failed: %v", err)
		return 0, translateDBErrors(err)
	} else if cnt, err := res.RowsAffected(); err != nil {
		logger.Errorf("commentService.MarkDeletedByUser: RowsAffected() failed: %v", err)
		return 0, translateDBErrors(err)
	} else {
		// Succeeded
		return cnt, nil
	}
}

func (svc *commentService) Moderated(comment *data.Comment) error {
	logger.Debugf("commentService.Moderated(%#v)", comment)

	// Update the record in the database
	if err := db.ExecuteOne(
		db.Dialect().
			Update("cm_comments").
			Set(goqu.Record{
				"is_pending":     comment.IsPending,
				"is_approved":    comment.IsApproved,
				"pending_reason": util.TruncateStr(comment.PendingReason, data.MaxPendingReasonLength),
				"ts_moderated":   comment.ModeratedTime,
				"user_moderated": comment.UserModerated,
			}).
			Where(goqu.Ex{"id": &comment.ID}),
	); err != nil {
		logger.Errorf("commentService.Moderated: ExecuteOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) SetMarkdown(comment *data.Comment, markdown string, domainID, editedUserID *uuid.UUID) {
	comment.Markdown = strings.TrimSpace(markdown)

	// Render the comment's HTML using settings of the corresponding domain
	comment.HTML = util.MarkdownToHTML(
		comment.Markdown,
		TheDomainConfigService.GetBool(domainID, data.DomainConfigKeyMarkdownLinksEnabled),
		TheDomainConfigService.GetBool(domainID, data.DomainConfigKeyMarkdownImagesEnabled),
		TheDomainConfigService.GetBool(domainID, data.DomainConfigKeyMarkdownTablesEnabled))

	// Update the audit fields, if required
	if editedUserID != nil {
		comment.UserEdited = uuid.NullUUID{UUID: *editedUserID, Valid: true}
		comment.EditedTime = data.NowNullable()
	}
}

func (svc *commentService) UpdateSticky(commentID *uuid.UUID, sticky bool) error {
	logger.Debugf("commentService.UpdateSticky(%s, %v)", commentID, sticky)

	// Update the row in the database
	if err := db.ExecuteOne(
		db.Dialect().
			Update("cm_comments").
			Set(goqu.Record{"is_sticky": sticky}).
			Where(goqu.Ex{"id": commentID}),
	); err != nil {
		logger.Errorf("commentService.UpdateSticky: ExecuteOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) Vote(commentID, userID *uuid.UUID, direction int8) (int, error) {
	// Retrieve the current score and any vote for the user
	var score int
	var neg sql.NullBool
	q := db.Dialect().
		From(goqu.T("cm_comments").As("c")).
		Select("c.score", "v.negative").
		LeftJoin(goqu.T("cm_comment_votes").As("v"), goqu.On(goqu.Ex{"v.comment_id": goqu.I("c.id"), "v.user_id": userID})).
		Where(goqu.Ex{"c.id": commentID})
	if err := db.SelectRow(q).Scan(&score, &neg); err != nil {
		return 0, translateDBErrors(err)
	}

	// Determine if a change is necessary
	if !neg.Valid {
		// No vote exists: don't bother if direction is 0
		if direction == 0 {
			return score, nil
		}
	} else {
		// Vote exists: don't bother if the direction already matches the vote
		if direction < 0 && neg.Bool || direction > 0 && !neg.Bool {
			return score, nil
		}
	}

	// A change is necessary
	var err error
	inc := 0
	if !neg.Valid {
		// No vote exists, an insert is needed
		err = db.ExecuteOne(
			db.Dialect().
				Insert("cm_comment_votes").
				Rows(goqu.Record{"comment_id": commentID, "user_id": userID, "negative": direction < 0, "ts_voted": time.Now().UTC()}))
		if direction < 0 {
			inc = -1
		} else {
			inc = 1
		}

	} else if direction == 0 {
		// Vote exists and must be removed
		err = db.ExecuteOne(db.Dialect().Delete("cm_comment_votes").Where(goqu.Ex{"comment_id": commentID, "user_id": userID}))
		if neg.Bool {
			inc = 1
		} else {
			inc = -1
		}

	} else {
		// Vote exists and must be updated
		err = db.ExecuteOne(
			db.Dialect().
				Update("cm_comment_votes").
				Set(goqu.Record{"negative": direction < 0, "ts_voted": time.Now().UTC()}).
				Where(goqu.Ex{"comment_id": commentID, "user_id": userID}))
		if neg.Bool {
			inc = 2
		} else {
			inc = -2
		}
	}
	if err != nil {
		return 0, translateDBErrors(err)
	}

	// Update the comment score
	if err := db.ExecuteOne(db.Dialect().Update("cm_comments").Set(goqu.Record{"score": score + inc}).Where(goqu.Ex{"id": commentID})); err != nil {
		return 0, translateDBErrors(err)
	}

	// Succeeded
	return score + inc, nil
}
