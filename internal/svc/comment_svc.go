package svc

import (
	"github.com/go-openapi/strfmt"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"time"
)

// TheCommentService is a global CommentService implementation
var TheCommentService CommentService = &commentService{}

// CommentService is a service interface for dealing with comments
type CommentService interface {
	// Approve sets the status of a comment with the given hex ID to 'approved'
	Approve(commentHex models.HexID) error
	// Create creates, persists, and returns a new comment
	Create(commenterHex models.HexID, host models.Host, path, markdown string, parentHex models.ParentHexID, state models.CommentState, creationDate strfmt.DateTime) (*models.Comment, error)
	// DeleteByHost deletes all comments for the specified domain
	DeleteByHost(host models.Host) error
	// FindByHexID finds and returns a comment with the given hex ID
	FindByHexID(commentHex models.HexID) (*models.Comment, error)
	// ListByHost returns a list of all comments for the given domain
	ListByHost(host models.Host) ([]models.Comment, error)
	// ListWithCommentersByPage returns a list of comments and related commenters for the given page. user is the
	// current authenticated/anonymous user
	ListWithCommentersByPage(user *data.User, page *data.DomainPage, isModerator bool) ([]*models.Comment, []*models.Commenter, error)
	// MarkDeleted mark a comment with the given hex ID deleted in the database
	MarkDeleted(commentHex models.HexID, deleterHex models.HexID) error
	// UpdateText updates the markdown and the HTML of a comment with the given hex ID in the database
	UpdateText(commentHex models.HexID, markdown, html string) error
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

func (svc *commentService) Create(commenterHex models.HexID, host models.Host, path, markdown string, parentHex models.ParentHexID, state models.CommentState, creationDate strfmt.DateTime) (*models.Comment, error) {
	logger.Debugf("commentService.Create(%s, %s, %s, ..., %s, %s, ...)", commenterHex, host, path, parentHex, state)

	// Generate a new comment hex ID
	commentHex, err := data.RandomHexID()
	if err != nil {
		return nil, err
	}

	// Convert the markdown into HTML
	html := util.MarkdownToHTML(markdown)

	// Persist a new page record (if necessary)
	if err = ThePageService.UpsertByHostPath(&models.Page{Host: host, Path: path}); err != nil {
		return nil, err
	}

	// Persist a new comment record
	c := models.Comment{
		CommentHex:   commentHex,
		CommenterHex: commenterHex,
		CreationDate: creationDate,
		Host:         host,
		HTML:         html,
		Markdown:     markdown,
		ParentHex:    parentHex,
		State:        state,
		Path:         path,
	}
	err = db.Exec(
		"insert into comments(commentHex, domain, path, commenterHex, parentHex, markdown, html, creationDate, state) "+
			"values($1, $2, $3, $4, $5, $6, $7, $8, $9);",
		c.CommentHex, c.Host, c.Path, fixCommenterHex(c.CommenterHex), c.ParentHex, c.Markdown, c.HTML, c.CreationDate, c.State)
	if err != nil {
		logger.Errorf("commentService.Create: Exec() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	return &c, nil
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

func (svc *commentService) FindByHexID(commentHex models.HexID) (*models.Comment, error) {
	logger.Debugf("commentService.FindByHexID(%s)", commentHex)

	// Query the database
	row := db.QueryRow(
		"select commenthex, commenterhex, domain, path, markdown, html, parenthex, score, state, deleted, creationdate "+
			"from comments "+
			"where commenthex=$1;",
		commentHex)

	// Fetch the comment
	var c models.Comment
	var crHex string
	err := row.Scan(
		&c.CommentHex, &crHex, &c.Host, &c.Path, &c.Markdown, &c.HTML, &c.ParentHex, &c.Score, &c.State, &c.Deleted,
		&c.CreationDate)
	if err != nil {
		return nil, translateDBErrors(err)
	}

	// Apply necessary conversions
	c.CommenterHex = unfixCommenterHex(crHex)

	// Succeeded
	return &c, nil
}

func (svc *commentService) ListByHost(host models.Host) ([]models.Comment, error) {
	logger.Debugf("commentService.ListByHost(%s)", host)

	// Query all domain's comments
	rows, err := db.Query(
		"select commenthex, domain, path, commenterhex, markdown, parenthex, score, state, creationdate from comments where domain=$1;",
		host)
	if err != nil {
		logger.Errorf("commentService.ListByHost: Query() failed: %v", host, err)
		return nil, translateDBErrors(err)
	}
	defer rows.Close()

	// Fetch the comments
	var res []models.Comment
	for rows.Next() {
		c := models.Comment{}
		var crHex string
		if err = rows.Scan(&c.CommentHex, &c.Host, &c.Path, &crHex, &c.Markdown, &c.ParentHex, &c.Score, &c.State, &c.CreationDate); err != nil {
			logger.Errorf("commentService.ListByHost: rows.Scan() failed: %v", err)
			return nil, translateDBErrors(err)
		}

		// Apply necessary conversions
		c.CommenterHex = unfixCommenterHex(crHex)

		// Add the comment to the list
		res = append(res, c)
	}

	// Check that Next() didn't error
	if err := rows.Err(); err != nil {
		logger.Errorf("commentService.ListByHost: Next() failed: %v", err)
		return nil, err
	}

	// Succeeded
	return res, nil
}

func (svc *commentService) ListWithCommentersByPage(user *data.User, page *data.DomainPage, isModerator bool) ([]*models.Comment, []*models.Commenter, error) {
	logger.Debugf("commentService.ListWithCommentersByPage([%s], %#v)", &user.ID, page)

	// Prepare a query
	statement :=
		"select " +
			// Comment fields
			"c.id, c.parent_id, c.page_id, c.markdown, c.html, c.score, c.is_approved, c.is_spam, c.is_deleted, " +
			"c.ts_created, c.user_created, " +
			// Commenter fields
			"u.id, u.email, u.name, u.website_url, coalesce(du.is_commenter, true), coalesce(du.is_moderator, false) " +
			// Iterate comments
			"from cm_comments c " +
			// Outer-join commenter users
			"left join cm_users u on u.id=c.user_created " +
			// Outer-join domain users
			"left join cm_domains_users du on du.user_id=c.user_created and du.domain_id=$1 " +
			"where c.page_id=$2 and !c.is_deleted"
	params := []any{&page.DomainID, &page.ID}

	// Anonymous user: only include approved
	if user.IsAnonymous() {
		statement += " and c.is_approved"

	} else if !isModerator {
		// Authenticated, non-moderator user: show only approved and all own comments
		statement += " and (c.is_approved or c.user_created=$3)"
		params = append(params, &user.ID)
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
		cm := models.Comment{}
		uc := models.Commenter{}
		var uid uuid.UUID
		var email strfmt.Email
		err := rs.Scan(
			// Comment
			&cm.ID,
			&cm.ParentID,
			&cm.PageID,
			&cm.Markdown,
			&cm.HTML,
			&cm.Score,
			&cm.IsApproved,
			&cm.IsSpam,
			&cm.IsDeleted,
			&cm.CreatedTime,
			&cm.UserCreated,
			// User
			&uid,
			&email,
			&uc.Name,
			&uc.WebsiteURL,
			&uc.IsCommenter,
			&uc.IsModerator)
		if err != nil {
			logger.Errorf("commentService.ListWithCommentersByPage: Scan() failed: %v", err)
			return nil, nil, translateDBErrors(err)
		}

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

		// Append the comment to the list
		comments = append(comments, &cm)
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

func (svc *commentService) MarkDeleted(commentHex models.HexID, deleterHex models.HexID) error {
	logger.Debugf("commentService.MarkDeleted(%s, %s)", commentHex, deleterHex)

	// Update the record in the database
	err := db.Exec(
		"update comments "+
			"set deleted=true, markdown='[deleted]', html='[deleted]', deleterhex=$1, deletiondate=$2 "+
			"where commenthex=$3;",
		deleterHex,
		time.Now().UTC(),
		commentHex)
	if err != nil {
		logger.Errorf("commentService.MarkDeleted: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *commentService) UpdateText(commentHex models.HexID, markdown, html string) error {
	logger.Debugf("commentService.UpdateText(%s, ...)", commentHex)

	// Update the row in the database
	if err := db.Exec("update comments set markdown=$1, html=$2 where commentHex=$3;", markdown, html, commentHex); err != nil {
		logger.Errorf("commentService.UpdateText: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}
