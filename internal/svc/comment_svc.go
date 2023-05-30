package svc

import (
	"database/sql"
	"github.com/go-openapi/strfmt"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/data"
	"time"
)

// TheCommentService is a global CommentService implementation
var TheCommentService CommentService = &commentService{}

// CommentService is a service interface for dealing with comments
type CommentService interface {
	// Approve sets the status of a comment with the given hex ID to 'approved'
	// Deprecated
	Approve(commentHex models.HexID) error
	// Create creates, persists, and returns a new comment
	Create(comment *data.Comment) error
	// DeleteByHost deletes all comments for the specified domain
	// Deprecated
	DeleteByHost(host models.Host) error
	// FindByID finds and returns a comment with the given ID
	FindByID(id *uuid.UUID) (*data.Comment, error)
	// ListWithCommentersByPage returns a list of comments and related commenters for the given page. user is the
	// current authenticated/anonymous user
	ListWithCommentersByPage(user *data.User, page *data.DomainPage, isModerator bool) ([]*models.Comment, []*models.Commenter, error)
	// MarkDeleted marks a comment with the given ID deleted by the given user
	MarkDeleted(commentID, userID *uuid.UUID) error
	// UpdateText updates the markdown and the HTML of a comment with the given ID in the database
	UpdateText(commentID *uuid.UUID, markdown, html string) error
	// Vote sets a vote for the given comment and user and updates the comment, return the updated comment's score
	Vote(commentID, userID *uuid.UUID, direction int8) (int, error)
}

//----------------------------------------------------------------------------------------------------------------------

// commentService is a blueprint CommentService implementation
type commentService struct{}

func (svc *commentService) Approve(commentHex models.HexID) error {
	logger.Debugf("commentService.Approve(%s)", commentHex)

	// Update the record in the database
	if err := db.Exec("update comments set state=$1 where commenthex=$2;", models.CommentStateApproved, commentHex); err != nil {
		logger.Errorf("commentService.Approve: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) Create(c *data.Comment) error {
	logger.Debugf("commentService.Create(%#v)", c)

	// Insert a record into the database
	if err := db.Exec(
		"insert into cm_comments("+
			"id, parent_id, page_id, markdown, html, score, is_sticky, is_approved, is_spam, is_deleted, ts_created, "+
			"ts_approved, ts_deleted, user_created, user_approved, user_deleted) "+
			"values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);",
		&c.ID, &c.ParentID, &c.PageID, c.Markdown, c.HTML, c.Score, c.IsSticky, c.IsApproved, c.IsSpam, c.IsDeleted,
		c.CreatedTime, c.ApprovedTime, c.DeletedTime, &c.UserCreated, &c.UserApproved, &c.UserDeleted,
	); err != nil {
		logger.Errorf("commentService.Create: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) DeleteByHost(host models.Host) error {
	logger.Debugf("commentService.DeleteByHost(%s)", host)

	// Delete records from the database
	if err := db.Exec("delete from comments where domain=$1;", host); err != nil {
		logger.Errorf("commentService.DeleteByHost: Exec() failed: %v", err)
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
		"select c.id, c.parent_id, c.page_id, c.markdown, c.html, c.score, c.is_sticky, c.is_approved, c.is_spam, c.is_deleted, c.ts_created, c.user_created "+
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
		&c.IsSpam,
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

func (svc *commentService) ListWithCommentersByPage(user *data.User, page *data.DomainPage, isModerator bool) ([]*models.Comment, []*models.Commenter, error) {
	logger.Debugf("commentService.ListWithCommentersByPage([%s], %#v)", &user.ID, page)

	// Prepare a query
	statement :=
		"select " +
			// Comment fields
			"c.id, c.parent_id, c.page_id, c.markdown, c.html, c.score, c.is_sticky, c.is_approved, c.is_spam, " +
			"c.is_deleted, c.ts_created, c.user_created, " +
			// Commenter fields
			"u.id, u.email, u.name, u.website_url, coalesce(du.is_commenter, true), coalesce(du.is_moderator, false), " +
			// Votes fields
			"v.negative " +
			// Iterate comments
			"from cm_comments c " +
			// Outer-join commenter users
			"left join cm_users u on u.id=c.user_created " +
			// Outer-join domain users
			"left join cm_domains_users du on du.user_id=c.user_created and du.domain_id=$1 " +
			// Outer-join comment votes
			"left join cm_comment_votes v on v.comment_id=c.id and v.user_id=$2 " +
			"where c.page_id=$3 and c.is_deleted=false"
	params := []any{&page.DomainID, &user.ID, &page.ID}

	// Anonymous user: only include approved
	if user.IsAnonymous() {
		statement += " and c.is_approved"

	} else if !isModerator {
		// Authenticated, non-moderator user: show only approved and all own comments
		statement += " and (c.is_approved or c.user_created=$2)"
	}
	statement += ";"

	// Fetch the comments
	rs, err := db.Query(statement, params...)
	if err != nil {
		logger.Errorf("commentService.ListWithCommentersByPage: Query() failed: %v", err)
		return nil, nil, translateDBErrors(err)
	}
	defer rs.Close()

	// Prepare commenter map: begin with only the "anonymous" one
	commenterMap := map[uuid.UUID]*models.Commenter{data.AnonymousUser.ID: data.AnonymousUser.ToCommenter(true, false)}

	// Iterate result rows
	var comments []*models.Comment
	for rs.Next() {
		// Fetch the comment and the related commenter
		c := data.Comment{}
		uc := models.Commenter{}
		var uid uuid.UUID
		var email strfmt.Email
		var negVote sql.NullBool
		err := rs.Scan(
			// Comment
			&c.ID,
			&c.ParentID,
			&c.PageID,
			&c.Markdown,
			&c.HTML,
			&c.Score,
			&c.IsSticky,
			&c.IsApproved,
			&c.IsSpam,
			&c.IsDeleted,
			&c.CreatedTime,
			&c.UserCreated,
			// User
			&uid,
			&email,
			&uc.Name,
			&uc.WebsiteURL,
			&uc.IsCommenter,
			&uc.IsModerator,
			// Vote
			&negVote)
		if err != nil {
			logger.Errorf("commentService.ListWithCommentersByPage: Scan() failed: %v", err)
			return nil, nil, translateDBErrors(err)
		}

		// Convert the comment
		cm := c.ToDTO()

		// Add the authenticated user to the map
		if uid != data.AnonymousUser.ID {
			uc.ID = strfmt.UUID(uid.String())
			// Only include the email if the user is a moderator
			if isModerator {
				uc.Email = email
			}
			if _, ok := commenterMap[uid]; !ok {
				commenterMap[uid] = &uc
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
	if err := rs.Err(); err != nil {
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
	err := db.Exec(
		"update cm_comments set is_deleted=true, markdown='', html='', ts_deleted=$1, user_deleted=$2 where id=$3;",
		time.Now().UTC(), userID, commentID)
	if err != nil {
		logger.Errorf("commentService.MarkDeleted: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) UpdateText(commentID *uuid.UUID, markdown, html string) error {
	logger.Debugf("commentService.UpdateText(%s, ...)", commentID)

	// Update the row in the database
	if err := db.Exec("update cm_comments set markdown=$1, html=$2 where id=$3;", markdown, html, commentID); err != nil {
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
		err = db.Exec("delete from cm_comment_votes where comment_id=$1 and user_id=$2;", commentID, userID)
		if neg.Bool {
			inc = 1
		} else {
			inc = -1
		}

	} else {
		// Vote exists and must be updated
		err = db.Exec("update cm_comment_votes set negative=$1, ts_voted=$2 where comment_id=$3 and user_id=$4;",
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
