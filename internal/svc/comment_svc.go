package svc

import (
	"database/sql"
	"github.com/doug-martin/goqu/v9"
	"github.com/doug-martin/goqu/v9/exp"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
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
	//   - filter is an optional substring to filter the result by.
	//   - sortBy is an optional property name to sort the result by. If empty, sorts by the path.
	//   - dir is the sort direction.
	//   - pageIndex is the page index, if negative, no pagination is applied.
	ListWithCommentersByDomainPage(
		curUser *data.User, curDomainUser *data.DomainUser, domainID, pageID, userID *uuid.UUID,
		inclApproved, inclPending, inclRejected, inclDeleted bool, filter, sortBy string, dir data.SortDirection,
		pageIndex int) ([]*models.Comment, []*models.Commenter, error)
	// MarkDeleted marks a comment with the given ID deleted by the given user
	MarkDeleted(commentID, userID *uuid.UUID) error
	// MarkDeletedByUser deletes all comments by the specified user, returning the affected comment count
	MarkDeletedByUser(curUserID, userID *uuid.UUID) (int64, error)
	// Moderate updates the moderation status of a comment with the given ID in the database
	Moderate(commentID, userID *uuid.UUID, pending, approved bool) error
	// UpdateSticky updates the stickiness flag of a comment with the given ID in the database
	UpdateSticky(commentID *uuid.UUID, sticky bool) error
	// UpdateText updates the markdown and the HTML of a comment with the given ID in the database
	UpdateText(commentID *uuid.UUID, markdown, html string) error
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
	q := db.Dialect().
		From(goqu.T("cm_comments").As("c")).
		Select(goqu.COUNT("*")).
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

	var cnt int64
	if err := db.SelectRow(q).Scan(&cnt); err != nil {
		logger.Errorf("commentService.Count: SelectRow() failed: %v", err)
		return 0, translateDBErrors(err)
	}

	// Succeeded
	return cnt, nil
}

func (svc *commentService) Create(c *data.Comment) error {
	logger.Debugf("commentService.Create(%#v)", c)

	// Insert a record into the database
	if err := db.Exec(
		"insert into cm_comments("+
			"id, parent_id, page_id, markdown, html, score, is_sticky, is_approved, is_pending, is_deleted, ts_created, "+
			"ts_moderated, ts_deleted, user_created, user_moderated, user_deleted) "+
			"values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);",
		&c.ID, &c.ParentID, &c.PageID, c.Markdown, c.HTML, c.Score, c.IsSticky, c.IsApproved, c.IsPending, c.IsDeleted,
		c.CreatedTime, c.ModeratedTime, c.DeletedTime, &c.UserCreated, &c.UserModerated, &c.UserDeleted,
	); err != nil {
		logger.Errorf("commentService.Create: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) FindByID(id *uuid.UUID) (*data.Comment, error) {
	logger.Debugf("commentService.FindByID(%s)", id)

	// Query the database
	var c data.Comment
	if err := db.QueryRow(
		"select c.id, c.parent_id, c.page_id, c.markdown, c.html, c.score, c.is_sticky, c.is_approved, c.is_pending, c.is_deleted, c.ts_created, c.user_created "+
			"from cm_comments c "+
			"where c.id=$1;",
		id,
	).Scan(
		&c.ID,
		&c.ParentID,
		&c.PageID,
		&c.Markdown,
		&c.HTML,
		&c.Score,
		&c.IsSticky,
		&c.IsApproved,
		&c.IsPending,
		&c.IsDeleted,
		&c.CreatedTime,
		&c.UserCreated,
	); err != nil {
		logger.Errorf("commentService.FindByID: QueryRow() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return &c, nil
}

func (svc *commentService) ListByDomain(domainID *uuid.UUID) ([]*models.Comment, error) {
	logger.Debugf("commentService.ListByDomain(%s)", domainID)

	// Prepare a query
	q := db.Dialect().
		From(goqu.T("cm_comments").As("c")).
		Select(
			// Comment fields
			"c.id", "c.parent_id", "c.page_id", "c.markdown", "c.html", "c.score", "c.is_sticky", "c.is_approved",
			"c.is_pending", "c.is_deleted", "c.ts_created", "c.user_created",
			// Page fields
			"p.path",
			// Domain fields
			"d.host", "d.is_https").
		// Join comment pages
		Join(goqu.T("cm_domain_pages").As("p"), goqu.On(goqu.Ex{"p.id": goqu.I("c.page_id")})).
		// Join domain
		Join(goqu.T("cm_domains").As("d"), goqu.On(goqu.Ex{"d.id": goqu.I("p.domain_id")})).
		// Filter by page domain
		Where(goqu.Ex{"p.domain_id": domainID})

	// Fetch the comments
	rows, err := db.Select(q)
	if err != nil {
		logger.Errorf("commentService.ListByDomain: Query() failed: %v", err)
		return nil, translateDBErrors(err)
	}
	defer rows.Close()

	// Iterate result rows
	var comments []*models.Comment
	for rows.Next() {
		// Fetch the comment
		c := data.Comment{}
		var pagePath, domainHost string
		var domainHTTPS bool
		err := rows.Scan(
			// Comment
			&c.ID,
			&c.ParentID,
			&c.PageID,
			&c.Markdown,
			&c.HTML,
			&c.Score,
			&c.IsSticky,
			&c.IsApproved,
			&c.IsPending,
			&c.IsDeleted,
			&c.CreatedTime,
			&c.UserCreated,
			// Page
			&pagePath,
			// Domain
			&domainHost,
			&domainHTTPS)
		if err != nil {
			logger.Errorf("commentService.ListByDomain: Scan() failed: %v", err)
			return nil, translateDBErrors(err)
		}

		// Convert the comment
		cm := c.ToDTO(domainHTTPS, domainHost, pagePath)

		// Append the comment to the list
		comments = append(comments, cm)
	}

	// Check that Next() didn't error
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Succeeded
	return comments, nil
}

func (svc *commentService) ListWithCommentersByDomainPage(curUser *data.User, curDomainUser *data.DomainUser,
	domainID, pageID, userID *uuid.UUID, inclApproved, inclPending, inclRejected, inclDeleted bool,
	filter, sortBy string, dir data.SortDirection, pageIndex int,
) ([]*models.Comment, []*models.Commenter, error) {
	logger.Debugf(
		"commentService.ListWithCommentersByDomainPage(%s, %#v, %s, %s, %s, %v, %v, %v, %v, '%s', '%s', %s, %d)",
		&curUser.ID, curDomainUser, domainID, pageID, userID, inclApproved, inclPending,
		inclRejected, inclDeleted, filter, sortBy, dir, pageIndex)

	// Prepare a query
	q := db.Dialect().
		From(goqu.T("cm_comments").As("c")).
		Select(
			// Comment fields
			"c.id", "c.parent_id", "c.page_id", "c.markdown", "c.html", "c.score", "c.is_sticky", "c.is_approved",
			"c.is_pending", "c.is_deleted", "c.ts_created", "c.user_created",
			// Commenter fields
			"u.id", "u.email", "u.name", "u.website_url", "u.is_superuser", "du.is_owner", "du.is_moderator",
			"du.is_commenter",
			// Avatar fields
			"a.user_id",
			// Votes fields
			"v.negative",
			// Page fields
			"p.path",
			// Domain fields
			"d.host", "d.is_https").
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
		goqu.I("p.id").Asc(), // Always add ID for stable ordering
	)

	// Paginate if required
	if pageIndex >= 0 {
		q = q.Limit(util.ResultPageSize).Offset(uint(pageIndex) * util.ResultPageSize)
	}

	// Fetch the comments
	rows, err := db.Select(q)
	if err != nil {
		logger.Errorf("commentService.ListWithCommentersByDomainPage: Query() failed: %v", err)
		return nil, nil, translateDBErrors(err)
	}
	defer rows.Close()

	// Prepare commenter map: begin with only the "anonymous" one
	commenterMap := map[uuid.UUID]*models.Commenter{data.AnonymousUser.ID: data.AnonymousUser.ToCommenter(true, false)}

	// Iterate result rows
	var comments []*models.Comment
	for rows.Next() {
		// Fetch the comment and the related commenter
		c := data.Comment{}
		var uID, avatarID uuid.NullUUID
		var uEmail, uName, uWebsite sql.NullString
		var uSuper, duIsOwner, duIsModerator, duIsCommenter, negVote sql.NullBool
		var pagePath, domainHost string
		var domainHTTPS bool
		err := rows.Scan(
			// Comment
			&c.ID,
			&c.ParentID,
			&c.PageID,
			&c.Markdown,
			&c.HTML,
			&c.Score,
			&c.IsSticky,
			&c.IsApproved,
			&c.IsPending,
			&c.IsDeleted,
			&c.CreatedTime,
			&c.UserCreated,
			// User
			&uID,
			&uEmail,
			&uName,
			&uWebsite,
			&uSuper,
			&duIsOwner,
			&duIsModerator,
			&duIsCommenter,
			// Avatar
			&avatarID,
			// Vote
			&negVote,
			// Page
			&pagePath,
			// Domain
			&domainHost,
			&domainHTTPS)
		if err != nil {
			logger.Errorf("commentService.ListWithCommentersByDomainPage: Scan() failed: %v", err)
			return nil, nil, translateDBErrors(err)
		}

		// Convert the comment, applying the required access privileges
		cm := c.
			CloneWithClearance(curUser, curDomainUser).
			ToDTO(domainHTTPS, domainHost, pagePath)

		// If the user exists and isn't anonymous
		if uID.Valid && uID.UUID != data.AnonymousUser.ID {
			// If the commenter isn't present in the map yet
			if _, ok := commenterMap[uID.UUID]; !ok {
				u := data.User{
					ID:          uID.UUID,
					Email:       uEmail.String,
					Name:        uName.String,
					IsSuperuser: uSuper.Valid && uSuper.Bool,
					WebsiteURL:  uWebsite.String,
					HasAvatar:   avatarID.Valid,
				}

				// Calculate commenter roles
				uIsOwner := u.IsSuperuser || duIsOwner.Valid && duIsOwner.Bool
				uIsModerator := uIsOwner || duIsModerator.Valid && duIsModerator.Bool

				// Convert the user into a commenter and add it to the map
				commenterMap[uID.UUID] = u.
					CloneWithClearance(
						curUser.IsSuperuser,
						curDomainUser != nil && curDomainUser.IsOwner,
						curDomainUser != nil && curDomainUser.IsModerator).
					ToCommenter(uIsModerator || !duIsCommenter.Valid || duIsCommenter.Bool, uIsModerator)
			}
		}

		// Determine comment vote direction for the user
		if negVote.Valid {
			if negVote.Bool {
				cm.Direction = -1
			} else {
				cm.Direction = 1
			}
		}

		// Append the comment to the list
		comments = append(comments, cm)
	}

	// Check that Next() didn't error
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	// Convert commenter map into a slice
	var commenters []*models.Commenter
	for _, commenter := range commenterMap {
		commenters = append(commenters, commenter)
	}

	// Succeeded
	return comments, commenters, nil
}

func (svc *commentService) MarkDeleted(commentID, userID *uuid.UUID) error {
	logger.Debugf("commentService.MarkDeleted(%s, %s)", commentID, userID)

	// Update the record in the database
	err := db.ExecOne(
		"update cm_comments set is_deleted=true, markdown='', html='', ts_deleted=$1, user_deleted=$2 where id=$3;",
		time.Now().UTC(), userID, commentID)
	if err != nil {
		logger.Errorf("commentService.MarkDeleted: Exec() failed: %v", err)
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
		Set(goqu.Record{"is_deleted": true, "ts_deleted": time.Now().UTC(), "user_deleted": curUserID}).
		Where(goqu.Ex{"user_created": userID})

	if res, err := db.ExecuteRes(q.Prepared(true)); err != nil {
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

func (svc *commentService) Moderate(commentID, userID *uuid.UUID, pending, approved bool) error {
	logger.Debugf("commentService.Moderate(%s, %s, %v, %v)", commentID, userID, pending, approved)

	// Update the record in the database
	err := db.ExecOne(
		"update cm_comments set is_pending=$1, is_approved=$2, ts_moderated=$3, user_moderated=$4 where id=$5;",
		pending, approved, time.Now().UTC(), userID, commentID)
	if err != nil {
		logger.Errorf("commentService.Moderate: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) UpdateSticky(commentID *uuid.UUID, sticky bool) error {
	logger.Debugf("commentService.UpdateSticky(%s, %v)", commentID, sticky)

	// Update the row in the database
	if err := db.ExecOne("update cm_comments set is_sticky=$1 where id=$2;", sticky, commentID); err != nil {
		logger.Errorf("commentService.UpdateSticky: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) UpdateText(commentID *uuid.UUID, markdown, html string) error {
	logger.Debugf("commentService.UpdateText(%s, ...)", commentID)

	// Update the row in the database
	if err := db.ExecOne("update cm_comments set markdown=$1, html=$2 where id=$3;", markdown, html, commentID); err != nil {
		logger.Errorf("commentService.UpdateText: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) Vote(commentID, userID *uuid.UUID, direction int8) (int, error) {
	// Retrieve the current score and any vote for the user
	var score int
	var neg sql.NullBool
	if err := db.QueryRow(
		"select c.score, v.negative "+
			"from cm_comments c "+
			"left join cm_comment_votes v on v.comment_id=c.id and v.user_id=$1 "+
			"where c.id=$2;",
		userID, commentID,
	).Scan(&score, &neg); err != nil {
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
		err = db.Exec(
			"insert into cm_comment_votes(comment_id, user_id, negative, ts_voted) values($1, $2, $3, $4);",
			commentID, userID, direction < 0, time.Now().UTC())
		if direction < 0 {
			inc = -1
		} else {
			inc = 1
		}

	} else if direction == 0 {
		// Vote exists and must be removed
		err = db.ExecOne("delete from cm_comment_votes where comment_id=$1 and user_id=$2;", commentID, userID)
		if neg.Bool {
			inc = 1
		} else {
			inc = -1
		}

	} else {
		// Vote exists and must be updated
		err = db.ExecOne("update cm_comment_votes set negative=$1, ts_voted=$2 where comment_id=$3 and user_id=$4;",
			direction < 0, time.Now().UTC(), commentID, userID)
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
	if err := db.ExecOne("update cm_comments set score=score+$1 where id=$2;", inc, commentID); err != nil {
		return 0, translateDBErrors(err)
	}

	// Succeeded
	return score + inc, nil
}
