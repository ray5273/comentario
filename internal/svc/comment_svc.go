package svc

import (
	"database/sql"
	"github.com/doug-martin/goqu/v9"
	"github.com/doug-martin/goqu/v9/exp"
	"github.com/go-openapi/strfmt"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/persistence"
	"gitlab.com/comentario/comentario/internal/util"
	"strings"
	"time"
)

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
	// ListWithCommenters returns a list of comments and related commenters for the given domain and, optionally, page
	// and/or user.
	//   - curUser is the current authenticated/anonymous user.
	//   - curDomainUser is the current domain user (can be nil).
	//   - domainID is the mandatory domain ID.
	//   - pageID is an optional page ID to filter the result by.
	//   - authorUserID is an optional comment author user ID to filter the result by.
	//   - replyToUserID is an optional user ID, whose comments are replied to, to filter the result by.
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
	ListWithCommenters(
		curUser *data.User, curDomainUser *data.DomainUser, domainID, pageID, authorUserID, replyToUserID *uuid.UUID,
		inclApproved, inclPending, inclRejected, inclDeleted, removeOrphans bool, filter, sortBy string, dir data.SortDirection,
		pageIndex int) ([]*models.Comment, map[uuid.UUID]*models.Commenter, error)
	// MarkDeleted marks a comment with the given ID deleted by the given user
	MarkDeleted(commentID, userID *uuid.UUID) error
	// MarkDeletedByUser deletes all comments by the specified user, returning the affected comment count
	MarkDeletedByUser(curUserID, userID *uuid.UUID) (int64, error)
	// Moderated persists the moderation status changes of the given comment in the database
	Moderated(comment *data.Comment) error
	// MoveToPage moves all comments from the source to the target page
	MoveToPage(sourcePageID, targetPageID *uuid.UUID) error
	// SetMarkdown updates the Markdown/HTML properties of the given comment in the specified domain. editedUserID
	// should point to the user who edited the comment in case it's edited, otherwise nil
	SetMarkdown(comment *data.Comment, markdown string, domainID, editedUserID *uuid.UUID) error
	// UpdateSticky updates the stickiness flag of a comment with the given ID in the database
	UpdateSticky(commentID *uuid.UUID, sticky bool) error
	// Vote sets a vote for the given comment and user and updates the comment, return the updated comment's score
	Vote(commentID, userID *uuid.UUID, direction int8) (int, error)
}

//----------------------------------------------------------------------------------------------------------------------

// commentService is a blueprint CommentService implementation
type commentService struct{ dbTxAware }

func (svc *commentService) Count(
	curUser *data.User, curDomainUser *data.DomainUser, domainID, pageID, userID *uuid.UUID,
	inclApproved, inclPending, inclRejected, inclDeleted bool) (int64, error) {
	logger.Debugf(
		"commentService.Count(%s, %#v, %s, %s, %s, %v, %v, %v, %v)",
		&curUser.ID, curDomainUser, domainID, pageID, userID, inclApproved, inclPending, inclRejected, inclDeleted)

	// Prepare a query
	q := svc.dbx().From(goqu.T("cm_comments").As("c")).
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
		return 0, translateDBErrors("commentService.Count/Count", err)
	}

	// Succeeded
	return cnt, nil
}

func (svc *commentService) Create(c *data.Comment) error {
	logger.Debugf("commentService.Create(%#v)", c)
	if err := persistence.ExecOne(svc.dbx().Insert("cm_comments").Rows(c)); err != nil {
		return translateDBErrors("commentService.Create/Insert", err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) DeleteByUser(userID *uuid.UUID) (int64, error) {
	logger.Debugf("commentService.DeleteByUser(%s)", userID)

	// Purge all comments created by the user. This will also remove all child comments thanks to the foreign key
	if res, err := svc.dbx().Delete("cm_comments").Where(goqu.Ex{"user_created": userID}).Executor().Exec(); err != nil {
		return 0, translateDBErrors("commentService.DeleteByUser/Delete", err)
	} else if cnt, err := res.RowsAffected(); err != nil {
		return 0, translateDBErrors("commentService.DeleteByUser/RowsAffected", err)
	} else {
		// Succeeded
		return cnt, nil
	}
}

func (svc *commentService) Edited(comment *data.Comment) error {
	logger.Debugf("commentService.Edited(%#v)", comment)

	// Update the row in the database
	err := persistence.ExecOne(
		svc.dbx().Update("cm_comments").
			Set(goqu.Record{
				"markdown":    comment.Markdown,
				"html":        comment.HTML,
				"ts_edited":   comment.EditedTime,
				"user_edited": comment.UserEdited,
			}).
			Where(goqu.Ex{"id": &comment.ID}))
	if err != nil {
		return translateDBErrors("commentService.Edited/Update", err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) FindByID(id *uuid.UUID) (*data.Comment, error) {
	logger.Debugf("commentService.FindByID(%s)", id)

	// Query the database
	var c data.Comment
	if b, err := svc.dbx().From("cm_comments").Where(goqu.Ex{"id": id}).ScanStruct(&c); err != nil {
		return nil, translateDBErrors("commentService.FindByID/ScanStruct", err)
	} else if !b {
		return nil, ErrNotFound
	}

	// Succeeded
	return &c, nil
}

func (svc *commentService) ListByDomain(domainID *uuid.UUID) ([]*models.Comment, error) {
	logger.Debugf("commentService.ListByDomain(%s)", domainID)

	// Prepare a query
	q := svc.dbx().From(goqu.T("cm_comments").As("c")).
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
		return nil, translateDBErrors("commentService.ListByDomain/ScanStructs", err)
	}

	// Convert models into DTOs
	var comments []*models.Comment
	for _, r := range dbRecs {
		comments = append(comments, r.Comment.ToDTO(r.DomainHTTPS, r.DomainHost, r.PagePath))
	}

	// Succeeded
	return comments, nil
}

func (svc *commentService) ListWithCommenters(curUser *data.User, curDomainUser *data.DomainUser,
	domainID, pageID, authorUserID, replyToUserID *uuid.UUID,
	inclApproved, inclPending, inclRejected, inclDeleted, removeOrphans bool,
	filter, sortBy string, dir data.SortDirection, pageIndex int,
) ([]*models.Comment, map[uuid.UUID]*models.Commenter, error) {
	logger.Debugf(
		"commentService.ListWithCommenters(%s, %#v, %s, %s, %s, %s, %v, %v, %v, %v, %v, %q, '%s', %s, %d)",
		&curUser.ID, curDomainUser, domainID, pageID, authorUserID, replyToUserID, inclApproved, inclPending, inclRejected, inclDeleted,
		removeOrphans, filter, sortBy, dir, pageIndex)

	// Prepare a query
	q := svc.dbx().From(goqu.T("cm_comments").As("c")).
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
	if authorUserID != nil {
		q = q.Where(goqu.Ex{"c.user_created": authorUserID})
	}

	// If there's a reply-to-user ID specified, include only replies to comments by that user, by inner-joining on the
	// parent comment authored by the user
	if replyToUserID != nil {
		q = q.Join(
			goqu.T("cm_comments").As("pc"),
			goqu.On(goqu.Ex{"pc.id": goqu.I("c.parent_id"), "pc.user_created": replyToUserID}))
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
		return nil, nil, translateDBErrors("commentService.ListWithCommenters/ScanStructs", err)
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
					ID:                r.UserID.UUID,
					Email:             r.UserEmail.String,
					Name:              r.UserName.String,
					IsSuperuser:       r.UserIsSuperuser.Valid && r.UserIsSuperuser.Bool,
					WebsiteURL:        r.UserWebsiteUrl.String,
					HasAvatar:         r.AvatarID.Valid,
					CountDomainsOwned: -1,
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

	// Succeeded
	return comments, commenterMap, nil
}

func (svc *commentService) MarkDeleted(commentID, userID *uuid.UUID) error {
	logger.Debugf("commentService.MarkDeleted(%s, %s)", commentID, userID)

	// Update the record in the database
	err := persistence.ExecOne(
		svc.dbx().Update("cm_comments").
			Set(goqu.Record{
				"is_deleted":     true,
				"markdown":       "",
				"html":           "",
				"pending_reason": "",
				"ts_deleted":     time.Now().UTC(),
				"user_deleted":   userID,
			}).
			Where(goqu.Ex{"id": commentID}))
	if err != nil {
		return translateDBErrors("commentService.MarkDeleted/Update", err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) MarkDeletedByUser(curUserID, userID *uuid.UUID) (int64, error) {
	logger.Debugf("commentService.MarkDeletedByUser(%s, %s)", curUserID, userID)

	// Update records from the database
	r := goqu.Record{
		"is_deleted":     true,
		"markdown":       "",
		"html":           "",
		"pending_reason": "",
		"ts_deleted":     time.Now().UTC(),
		"user_deleted":   curUserID,
	}
	if res, err := svc.dbx().Update("cm_comments").Set(r).Where(goqu.Ex{"user_created": userID}).Executor().Exec(); err != nil {
		return 0, translateDBErrors("commentService.MarkDeletedByUser/Exec", err)
	} else if cnt, err := res.RowsAffected(); err != nil {
		return 0, translateDBErrors("commentService.MarkDeletedByUser/RowsAffected", err)
	} else {
		// Succeeded
		return cnt, nil
	}
}

func (svc *commentService) Moderated(comment *data.Comment) error {
	logger.Debugf("commentService.Moderated(%#v)", comment)

	// Update the record in the database
	err := persistence.ExecOne(
		svc.dbx().Update("cm_comments").
			Set(goqu.Record{
				"is_pending":     comment.IsPending,
				"is_approved":    comment.IsApproved,
				"pending_reason": util.TruncateStr(comment.PendingReason, data.MaxPendingReasonLength),
				"ts_moderated":   comment.ModeratedTime,
				"user_moderated": comment.UserModerated,
			}).
			Where(goqu.Ex{"id": &comment.ID}))
	if err != nil {
		return translateDBErrors("commentService.Moderated/Update", err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) MoveToPage(sourcePageID, targetPageID *uuid.UUID) error {
	logger.Debugf("commentService.MoveToPage(%s, %s)", sourcePageID, targetPageID)

	// Update comment rows in the database
	if _, err := svc.dbx().Update("cm_comments").Set(goqu.Record{"page_id": targetPageID}).Where(goqu.Ex{"page_id": sourcePageID}).Executor().Exec(); err != nil {
		return translateDBErrors("commentService.MoveToPage/Exec", err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) SetMarkdown(comment *data.Comment, markdown string, domainID, editedUserID *uuid.UUID) error {
	logger.Debugf("commentService.SetMarkdown(%v, %q, %s, %s)", comment, markdown, domainID, editedUserID)

	dc, err := Services.DomainConfigService(nil).GetAll(domainID)
	if err != nil {
		return err
	}

	// Validate comment length
	maxLen := dc.GetInt(data.DomainConfigKeyMaxCommentLength)
	md := strings.TrimSpace(markdown)
	if l := len(md); l > maxLen {
		logger.Errorf("commentService.SetMarkdown: comment text length (%d bytes) > allowed (%d bytes)", l, maxLen)
		return ErrCommentTooLong
	}

	// Render the comment's HTML using settings of the corresponding domain
	comment.Markdown = md
	comment.HTML = util.MarkdownToHTML(
		md,
		dc.GetBool(data.DomainConfigKeyMarkdownLinksEnabled),
		dc.GetBool(data.DomainConfigKeyMarkdownImagesEnabled),
		dc.GetBool(data.DomainConfigKeyMarkdownTablesEnabled))

	// Update the audit fields, if required
	if editedUserID != nil {
		comment.UserEdited = uuid.NullUUID{UUID: *editedUserID, Valid: true}
		comment.EditedTime = data.NowNullable()
	}

	// Succeeded
	return nil
}

func (svc *commentService) UpdateSticky(commentID *uuid.UUID, sticky bool) error {
	logger.Debugf("commentService.UpdateSticky(%s, %v)", commentID, sticky)

	// Update the row in the database
	err := persistence.ExecOne(svc.dbx().Update("cm_comments").Set(goqu.Record{"is_sticky": sticky}).Where(goqu.Ex{"id": commentID}))
	if err != nil {
		return translateDBErrors("commentService.UpdateSticky/Update", err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) Vote(commentID, userID *uuid.UUID, direction int8) (int, error) {
	logger.Debugf("commentService.Vote(%s, %s, %v)", commentID, userID, direction)

	// Retrieve the current score and any vote for the user
	var r struct {
		Score    int          `db:"score"`
		Negative sql.NullBool `db:"negative" goqu:"skipupdate"`
	}
	b, err := svc.dbx().From(goqu.T("cm_comments").As("c")).
		Select("c.score", "v.negative").
		LeftJoin(goqu.T("cm_comment_votes").As("v"), goqu.On(goqu.Ex{"v.comment_id": goqu.I("c.id"), "v.user_id": userID})).
		Where(goqu.Ex{"c.id": commentID}).
		ScanStruct(&r)
	if err != nil {
		return 0, translateDBErrors("commentService.Vote/ScanStruct", err)
	} else if !b {
		return 0, ErrNotFound
	}

	// Determine if a change is necessary
	if !r.Negative.Valid {
		// No vote exists: don't bother if direction is 0
		if direction == 0 {
			return r.Score, nil
		}

		// Vote exists: don't bother if the direction already matches the vote
	} else if direction < 0 && r.Negative.Bool || direction > 0 && !r.Negative.Bool {
		return r.Score, nil
	}

	// A change is necessary
	var op string
	inc := 0
	vote := &data.CommentVote{
		CommentID:  *commentID,
		UserID:     *userID,
		IsNegative: direction < 0,
		VotedTime:  time.Now().UTC(),
	}
	switch {
	// No vote exists, an insert is needed
	case !r.Negative.Valid:
		err = persistence.ExecOne(svc.dbx().Insert("cm_comment_votes").Rows(vote))
		inc = util.If(direction < 0, -1, 1)
		op = "Insert"

	// Vote exists and must be removed
	case direction == 0:
		err = persistence.ExecOne(svc.dbx().Delete("cm_comment_votes").Where(goqu.Ex{"comment_id": commentID, "user_id": userID}))
		inc = util.If(r.Negative.Bool, 1, -1)
		op = "Delete"

	// Vote exists and must be updated
	default:
		err = persistence.ExecOne(svc.dbx().Update("cm_comment_votes").Set(vote).Where(goqu.Ex{"comment_id": commentID, "user_id": userID}))
		inc = util.If(r.Negative.Bool, 2, -2)
		op = "Update"
	}
	if err != nil {
		return 0, translateDBErrors("commentService.Vote/"+op, err)
	}

	// Update the comment score
	r.Score += inc
	if err := persistence.ExecOne(svc.dbx().Update("cm_comments").Set(r).Where(goqu.Ex{"id": commentID})); err != nil {
		return 0, translateDBErrors("commentService.Vote/Update[comment update]", err)
	}

	// Succeeded
	return r.Score, nil
}
