package svc

import (
	"database/sql"
	"github.com/go-openapi/strfmt"
	"github.com/google/uuid"
	"github.com/op/go-logging"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"time"
)

// TheUserService is a global UserService implementation
var TheUserService UserService = &userService{}

// UserService is a service interface for dealing with users
type UserService interface {
	// CreateUserSession persists a new user session
	CreateUserSession(s *data.UserSession) error
	// DeleteUserSession removes a user session from the database
	DeleteUserSession(id *uuid.UUID) error
	// FindLocalUserByEmail finds and returns a locally-authenticated user by the given email
	FindLocalUserByEmail(email string) (*data.User, error)
	// FindUserBySession finds and returns a user by the given user and session ID
	FindUserBySession(userID, sessionID *uuid.UUID) (*data.User, error)

	//------------------------------------------------------------------

	// ConfirmOwner confirms the owner's email using the specified token.
	// Deprecated
	ConfirmOwner(confirmToken models.HexID) error
	// CreateCommenter creates and persists a new commenter. If no idp is provided, the local auth provider is assumed
	CreateCommenter(email, name, websiteURL, photoURL, idp, password string) (*data.UserCommenter, error)
	// CreateCommenterSession creates and persists a new commenter session record, returning session token
	CreateCommenterSession(id models.HexID) (models.HexID, error)
	// CreateOwner creates and persists a new owner user
	// Deprecated
	CreateOwner(email, name, password string) (*data.UserOwner, error)
	// CreateOwnerConfirmationToken creates, persists, and returns a new owner confirmation token
	// Deprecated
	CreateOwnerConfirmationToken(userID models.HexID) (models.HexID, error)
	// CreateResetToken creates and persists a new password reset token for an owner (commenter == false) or a commenter
	// (commenter == true) user with the given hex ID
	CreateResetToken(userID models.HexID, commenter bool) (models.HexID, error)
	// DeleteCommenterSession removes a commenter session by hex ID and token from the database
	DeleteCommenterSession(id, token models.HexID) error
	// DeleteOwnerByID removes an owner user by their hex ID
	// Deprecated
	DeleteOwnerByID(id models.HexID) error
	// DeleteResetTokens removes all password reset tokens for the given user
	DeleteResetTokens(userID models.HexID) error
	// FindCommenterByEmail finds and returns the first commenter having the specified email only, ignoring the identity
	// provider (this is a shortcoming of the inherited implementation)
	FindCommenterByEmail(email string) (*data.UserCommenter, error)
	// FindCommenterByID finds and returns a commenter user by their hex ID
	FindCommenterByID(id models.HexID) (*data.UserCommenter, error)
	// FindCommenterByIdPEmail finds and returns a commenter user by their email and identity provider. If no idp is
	// provided, the local auth provider (Comentario) is assumed
	FindCommenterByIdPEmail(idp, email string, readPwdHash bool) (*data.UserCommenter, error)
	// FindCommenterByToken finds and returns a commenter user by their token
	FindCommenterByToken(token models.HexID) (*data.UserCommenter, error)
	// FindOwnerByEmail finds and returns an owner user by their email
	// Deprecated
	FindOwnerByEmail(email string, readPwdHash bool) (*data.UserOwner, error)
	// FindOwnerByID finds and returns an owner user by their hex ID, optionally reading in the password hash
	// Deprecated
	FindOwnerByID(id models.HexID, readPwdHash bool) (*data.UserOwner, error)
	// FindOwnerByToken finds and returns an owner user by their token
	// Deprecated
	FindOwnerByToken(token models.HexID) (*data.UserOwner, error)
	// ListCommentersByHost returns a list of all commenters for the (comments of) given domain
	ListCommentersByHost(host models.Host) ([]models.Commenter, error)
	// ResetUserPasswordByToken finds and resets a user's password for the given reset token, returning the
	// corresponding entity
	ResetUserPasswordByToken(token models.HexID, password string) error
	// UpdateCommenter updates the given commenter's data in the database. If no idp is provided, the local auth
	// provider is assumed
	UpdateCommenter(commenterHex models.HexID, email, name, websiteURL, photoURL, idp string) error
	// UpdateCommenterSession links a commenter token to the given commenter, by updating the session record
	UpdateCommenterSession(token, id models.HexID) error
	// UpdateOwner updates the given user's data in the database. If no newPassword is given, the password stays
	// unchanged
	// Deprecated
	UpdateOwner(id models.HexID, name, newPassword string) error
}

//----------------------------------------------------------------------------------------------------------------------

// userService is a blueprint UserService implementation
type userService struct{}

func (svc *userService) ConfirmOwner(confirmToken models.HexID) error {
	logger.Debugf("userService.ConfirmOwner(%s)", confirmToken)

	// Update the owner's record
	res, err := db.ExecRes(
		"update owners set confirmedemail=true where ownerhex in (select ownerhex from ownerconfirmhexes where confirmhex=$1);",
		confirmToken)
	if err != nil {
		logger.Errorf("userService.ConfirmOwner: ExecRes() failed (owner update): %v", err)
		return translateDBErrors(err)
	}

	// Check if there was indeed an update
	if count, err := res.RowsAffected(); err != nil {
		logger.Errorf("userService.ConfirmOwner: res.RowsAffected() failed: %v", err)
		return translateDBErrors(err)
	} else if count == 0 {
		return ErrNotFound
	}

	// Remove the token from the database
	if err := db.Exec("delete from ownerconfirmhexes where confirmhex=$1;", confirmToken); err != nil {
		logger.Warningf("userService.ConfirmOwner: Exec() failed (token removal): %v", err)
	}

	// Succeeded
	return nil
}

func (svc *userService) CreateCommenter(email, name, websiteURL, photoURL, idp, password string) (*data.UserCommenter, error) {
	logger.Debugf("userService.CreateCommenter(%s, %s, %s, %s, %s, %s)", email, name, websiteURL, photoURL, idp, password)

	// Register a new email
	if _, err := TheEmailService.Create(email); err != nil {
		return nil, err
	}

	// Create an initial commenter instance
	uc := data.UserCommenter{
		User: data.User{
			Email:   email,
			Created: time.Now().UTC(),
			Name:    name,
		},
		WebsiteURL: websiteURL,
		PhotoURL:   photoURL,
		Provider:   idp,
	}

	// Generate a random hex ID
	if id, err := data.RandomHexID(); err != nil {
		return nil, err
	} else {
		uc.HexID = id
	}

	// Hash the user's password, if any
	if err := uc.SetPassword(password); err != nil {
		return nil, err
	}

	// Insert a commenter record
	err := db.Exec(
		"insert into commenters(commenterhex, email, name, link, photo, provider, passwordhash, joindate) values($1, $2, $3, $4, $5, $6, $7, $8);",
		uc.HexID,
		uc.Email,
		uc.Name,
		fixUndefined(uc.WebsiteURL),
		fixUndefined(uc.PhotoURL),
		fixIdP(uc.Provider),
		uc.PasswordHash,
		time.Now().UTC())
	if err != nil {
		logger.Errorf("userService.CreateCommenter: Exec() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return &uc, nil
}

func (svc *userService) CreateCommenterSession(id models.HexID) (models.HexID, error) {
	logger.Debugf("userService.CreateCommenterSession(%s)", id)

	// Generate a new random token
	token, err := data.RandomHexID()
	if err != nil {
		logger.Errorf("userService.CreateCommenterSession: RandomHexID() failed: %v", err)
		return "", err
	}

	// Insert a new record
	err = db.Exec(
		"insert into commentersessions(commentertoken, commenterhex, creationdate) values($1, $2, $3);",
		token, id, time.Now().UTC())
	if err != nil {
		logger.Errorf("userService.CreateCommenterSession: Exec() failed: %v", err)
		return "", translateDBErrors(err)
	}

	// Succeeded
	return token, nil
}

func (svc *userService) CreateOwner(email, name, password string) (*data.UserOwner, error) {
	logger.Debugf("userService.CreateOwner(%s, %s, %s)", email, name, password)

	// Create an initial owner instance
	uo := data.UserOwner{
		User: data.User{
			Email:   email,
			Created: time.Now().UTC(),
			Name:    name,
		},
		// If no SMTP is configured, mark the owner confirmed at once
		EmailConfirmed: !config.SMTPConfigured,
	}

	// Generate a random hex ID
	if id, err := data.RandomHexID(); err != nil {
		return nil, err
	} else {
		uo.HexID = id
	}

	// Hash the user's password, if any
	if err := uo.SetPassword(password); err != nil {
		return nil, err
	}

	// Insert a new owner record
	err := db.Exec(
		"insert into owners(ownerhex, email, name, passwordhash, joindate, confirmedemail) values($1, $2, $3, $4, $5, $6);",
		uo.HexID, uo.Email, uo.Name, uo.PasswordHash, uo.Created, uo.EmailConfirmed)
	if err != nil {
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return &uo, nil
}

func (svc *userService) CreateOwnerConfirmationToken(userID models.HexID) (models.HexID, error) {
	logger.Debugf("userService.CreateOwnerConfirmationToken(%s)", userID)

	// Generate a new random token
	token, err := data.RandomHexID()
	if err != nil {
		logger.Errorf("userService.CreateOwnerConfirmationToken: RandomHexID() failed: %v", err)
		return "", err
	}

	// Insert a new record
	err = db.Exec(
		"insert into ownerconfirmhexes(confirmhex, ownerhex, senddate) values($1, $2, $3);",
		token, userID, time.Now().UTC())
	if err != nil {
		logger.Errorf("userService.CreateOwnerConfirmationToken: Exec() failed: %v", err)
		return "", translateDBErrors(err)
	}

	// Succeeded
	return token, nil
}

func (svc *userService) CreateResetToken(userID models.HexID, commenter bool) (models.HexID, error) {
	logger.Debugf("userService.CreateResetToken(%s, %v)", userID, commenter)

	// Generate a random reset token
	token, err := data.RandomHexID()
	if err != nil {
		logger.Errorf("userService.CreateResetToken: util.RandomHexID() failed: %v", err)
		return "", err
	}

	// Determine the "entity"
	entity := "owner"
	if commenter {
		entity = "commenter"
	}

	// Persist the token
	err = db.Exec(
		"insert into resethexes(resethex, hex, entity, senddate) values($1, $2, $3, $4);",
		token, userID, entity, time.Now().UTC())
	if err != nil {
		logger.Errorf("userService.CreateResetToken: Exec() failed: %v", err)
		return "", translateDBErrors(err)
	}

	// Succeeded
	return token, nil
}

func (svc *userService) CreateUserSession(s *data.UserSession) error {
	logger.Debugf("userService.CreateUserSession(%v)", s)

	// Insert a new record
	err := db.Exec(
		"insert into cm_user_sessions("+
			"id, user_id, ts_created, ts_expires, host, proto, ip, country, ua_browser_name, ua_browser_version, "+
			"ua_os_name, ua_os_version, ua_device) "+
			"values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);",
		s.ID, s.UserID, s.CreatedTime, s.ExpiresTime, s.Host, s.Proto, s.IP, s.Country, s.BrowserName, s.BrowserVersion,
		s.OSName, s.OSVersion, s.Device)
	if err != nil {
		logger.Errorf("userService.CreateUserSession: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *userService) DeleteCommenterSession(id, token models.HexID) error {
	logger.Debugf("userService.DeleteCommenterSession(%s, %s)", id, token)

	// Delete the record
	if err := db.Exec("delete from commentersessions where commenterhex=$1 and commentertoken=$2;", id, token); err != nil {
		logger.Errorf("userService.DeleteCommenterSession: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *userService) DeleteOwnerByID(id models.HexID) error {
	logger.Debugf("userService.DeleteOwnerByID(%s)", id)

	// Remove all user's reset tokens
	if err := svc.DeleteResetTokens(id); err != nil {
		return err
	}

	// Remove all user's sessions
	if err := db.Exec("delete from ownersessions where ownerhex=$1;", id); err != nil {
		logger.Errorf("userService.DeleteOwnerByID: Exec() failed for ownersessions: %v", err)
		return translateDBErrors(err)
	}

	// Delete the owner user
	if err := db.Exec("delete from owners where ownerhex=$1;", id); err != nil {
		logger.Errorf("userService.DeleteOwnerByID: Exec() failed for owners: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *userService) DeleteResetTokens(userID models.HexID) error {
	logger.Debugf("userService.DeleteResetTokens(%s)", userID)

	// Delete all tokens by user
	if err := db.Exec("delete from resethexes where hex=$1;", userID); err != nil {
		logger.Errorf("userService.DeleteResetTokens: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *userService) DeleteUserSession(id *uuid.UUID) error {
	logger.Debugf("userService.DeleteUserSession(%s)", id)

	// Delete the record
	if err := db.Exec("delete from cm_user_sessions where id=$1;", id); err != nil {
		logger.Errorf("userService.DeleteUserSession: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *userService) FindCommenterByEmail(email string) (*data.UserCommenter, error) {
	logger.Debugf("userService.FindCommenterByEmail(%s)", email)

	// Query the database
	row := db.QueryRow(
		"select commenterhex, email, name, link, photo, provider, joindate, passwordhash from commenters where email=$1;",
		email)

	// Fetch the commenter user
	if u, err := svc.fetchCommenter(row, false); err != nil {
		return nil, translateDBErrors(err)
	} else {
		return u, nil
	}
}

func (svc *userService) FindCommenterByID(id models.HexID) (*data.UserCommenter, error) {
	logger.Debugf("userService.FindCommenterByID(%s)", id)

	// Make sure we don't try to find an "anonymous" commenter
	if id == data.AnonymousCommenter.HexID {
		return nil, ErrNotFound
	}

	// Query the database
	row := db.QueryRow(
		"select commenterhex, email, name, link, photo, provider, joindate, passwordhash from commenters where commenterhex=$1;",
		id)

	// Fetch the commenter user
	if u, err := svc.fetchCommenter(row, false); err != nil {
		return nil, translateDBErrors(err)
	} else {
		return u, nil
	}
}

func (svc *userService) FindCommenterByIdPEmail(idp, email string, readPwdHash bool) (*data.UserCommenter, error) {
	logger.Debugf("userService.FindCommenterByIdPEmail(%s, %s)", idp, email)

	// Query the database
	row := db.QueryRow(
		"select commenterhex, email, name, link, photo, provider, joindate, passwordhash "+
			"from commenters "+
			"where provider=$1 and email=$2;",
		fixIdP(idp),
		email)

	// Fetch the commenter user
	if u, err := svc.fetchCommenter(row, readPwdHash); err != nil {
		return nil, translateDBErrors(err)
	} else {
		return u, nil
	}
}

func (svc *userService) FindCommenterByToken(token models.HexID) (*data.UserCommenter, error) {
	logger.Debugf("userService.FindCommenterByToken(%s)", token)

	// Make sure we don't try to find an "anonymous" commenter
	if token == data.AnonymousCommenter.HexID {
		return nil, ErrNotFound
	}

	// Query the database
	row := db.QueryRow(
		"select c.commenterHex, c.email, c.name, c.link, c.photo, c.provider, c.joinDate, c.passwordhash "+
			"from commentersessions s "+
			"join commenters c on s.commenterhex = c.commenterhex "+
			"where s.commentertoken=$1;",
		token)

	// Fetch the commenter user
	if u, err := svc.fetchCommenter(row, false); err != nil {
		return nil, translateDBErrors(err)
	} else {
		return u, nil
	}
}

func (svc *userService) FindLocalUserByEmail(email string) (*data.User, error) {
	logger.Debugf("userService.FindLocalUserByEmail(%s)", email)

	// Query the database
	row := db.QueryRow(
		"select "+
			"u.id, u.email, u.name, u.password_hash, u.system_account, u.superuser, u.confirmed, u.ts_confirmed, "+
			"u.ts_created, u.user_created, u.signup_ip, u.signup_country, u.banned, u.ts_banned, u.user_banned, "+
			"u.remarks, u.federated_idp, u.federated_id, u.avatar, u.website_url "+
			"from cm_users u "+
			"where u.email=$1 and u.federated_idp is null;",
		email)

	// Fetch the owner user
	if u, err := svc.fetchUser(row); err != nil {
		return nil, translateDBErrors(err)
	} else {
		return u, nil
	}
}

func (svc *userService) FindOwnerByEmail(email string, readPwdHash bool) (*data.UserOwner, error) {
	logger.Debugf("userService.FindOwnerByEmail(%s)", email)

	// Query the database
	row := db.QueryRow("select ownerhex, email, name, confirmedemail, joindate, passwordhash from owners where email=$1;", email)

	// Fetch the owner user
	if u, err := svc.fetchOwner(row, readPwdHash); err != nil {
		return nil, translateDBErrors(err)
	} else {
		return u, nil
	}
}

func (svc *userService) FindOwnerByID(id models.HexID, readPwdHash bool) (*data.UserOwner, error) {
	logger.Debugf("userService.FindOwnerByID(%s)", id)

	// Query the database
	row := db.QueryRow("select ownerhex, email, name, confirmedemail, joindate, passwordhash from owners where ownerhex=$1;", id)

	// Fetch the owner user
	if u, err := svc.fetchOwner(row, readPwdHash); err != nil {
		return nil, translateDBErrors(err)
	} else {
		return u, nil
	}
}

func (svc *userService) FindOwnerByToken(token models.HexID) (*data.UserOwner, error) {
	logger.Debugf("userService.FindOwnerByToken(%s)", token)

	// Query the database
	row := db.QueryRow(
		"select ownerhex, email, name, confirmedemail, joindate, passwordhash "+
			"from owners "+
			"where ownerhex in (select ownerhex from ownersessions where ownertoken=$1);",
		token)

	// Fetch the owner user
	if u, err := svc.fetchOwner(row, false); err != nil {
		return nil, translateDBErrors(err)
	} else {
		return u, nil
	}
}

func (svc *userService) FindUserBySession(userID, sessionID *uuid.UUID) (*data.User, error) {
	logger.Debugf("userService.FindUserBySession(%s, %s)", userID, sessionID)

	// Query the database
	row := db.QueryRow(
		"select "+
			"u.id, u.email, u.name, u.password_hash, u.system_account, u.superuser, u.confirmed, u.ts_confirmed, "+
			"u.ts_created, u.user_created, u.signup_ip, u.signup_country, u.banned, u.ts_banned, u.user_banned, "+
			"u.remarks, u.federated_idp, u.federated_id, u.avatar, u.website_url "+
			"from cm_users u "+
			"join cm_user_sessions s on s.user_id=u.id"+
			"where u.id=$1 and s.id=$2 and s.ts_created<$3 and s.ts_expires>=$3;",
		userID, sessionID, time.Now().UTC())

	// Fetch the owner user
	if u, err := svc.fetchUser(row); err != nil {
		return nil, translateDBErrors(err)
	} else {
		return u, nil
	}
}

func (svc *userService) ListCommentersByHost(host models.Host) ([]models.Commenter, error) {
	logger.Debugf("userService.ListCommentersByHost(%s)", host)

	// Query all commenters of the domain's comments
	rows, err := db.Query(
		"select r.commenterhex, r.email, r.name, r.link, r.photo, r.provider, r.joindate "+
			"from comments c "+
			"join commenters r on r.commenterhex=c.commenterhex "+
			"where c.domain=$1;",
		host)
	if err != nil {
		logger.Errorf("commentService.ListCommentersByHost: Query() failed: %v", host, err)
		return nil, translateDBErrors(err)
	}
	defer rows.Close()

	// Fetch the comments
	var res []models.Commenter
	var link, photo, provider string
	for rows.Next() {
		r := models.Commenter{}
		if err = rows.Scan(&r.CommenterHex, &r.Email, &r.Name, &link, &photo, &provider, &r.JoinDate); err != nil {
			logger.Errorf("commentService.ListCommentersByHost: rows.Scan() failed: %v", err)
			return nil, translateDBErrors(err)
		}

		// Apply necessary conversions
		r.WebsiteURL = strfmt.URI(unfixUndefined(link))
		r.AvatarURL = strfmt.URI(unfixUndefined(photo))
		r.Provider = unfixIdP(provider)

		// Add the commenter to the result
		res = append(res, r)
	}

	// Check that Next() didn't error
	if err := rows.Err(); err != nil {
		logger.Errorf("commentService.ListCommentersByHost: Next() failed: %v", err)
		return nil, err
	}

	// Succeeded
	return res, nil
}

func (svc *userService) ResetUserPasswordByToken(token models.HexID, password string) error {
	logger.Debugf("userService.ResetUserPasswordByToken(%s, %s)", token, password)

	// Find and fetch the token record
	var user data.User // Just use a generic user for both entities
	var entity string
	row := db.QueryRow("select hex, entity from resethexes where resethex=$1;", token)
	if err := row.Scan(&user.HexID, &entity); err != nil {
		// Unknown token
		if err == sql.ErrNoRows {
			return ErrBadToken
		}

		// Any other database error
		logger.Errorf("userService.ResetUserPasswordByToken: Scan() failed: %v", err)
		return translateDBErrors(err)
	}

	// Hash the user's password, if any
	if err := user.SetPassword(password); err != nil {
		return err
	}

	// Fetch the user and update their password
	if entity == "owner" {
		// Owner user
		if _, err := svc.FindOwnerByID(user.HexID, false); err != nil {
			return err
		} else if err := db.Exec("update owners set passwordhash=$1 where ownerhex=$2;", user.PasswordHash, user.HexID); err != nil {
			logger.Errorf("userService.ResetUserPasswordByToken: Exec() failed for owner: %v", err)
			return translateDBErrors(err)
		}
	} else {
		// Commenter user
		if _, err := svc.FindCommenterByID(user.HexID); err != nil {
			return err
		} else if err := db.Exec("update commenters set passwordhash=$1 where commenterhex=$2;", user.PasswordHash, user.HexID); err != nil {
			logger.Errorf("userService.ResetUserPasswordByToken: Exec() failed for commenter: %v", err)
			return translateDBErrors(err)
		}
	}

	// Remove all the user's reset tokens, ignoring any error
	_ = svc.DeleteResetTokens(user.HexID)

	// Succeeded
	return nil
}

func (svc *userService) UpdateCommenter(commenterHex models.HexID, email, name, websiteURL, photoURL, idp string) error {
	logger.Debugf("userService.UpdateCommenter(%s, %s, %s, %s, %s, %s)", commenterHex, email, name, websiteURL, photoURL, idp)

	// Update the database record
	err := db.Exec(
		"update commenters set email=$1, name=$2, link=$3, photo=$4 where commenterhex=$5 and provider=$6;",
		email, name, fixUndefined(websiteURL), fixUndefined(photoURL), commenterHex, fixIdP(idp))
	if err != nil {
		logger.Errorf("userService.UpdateCommenter: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *userService) UpdateCommenterSession(token, id models.HexID) error {
	logger.Debugf("userService.UpdateCommenterSession(%s, %s)", token, id)

	// Update the record
	if err := db.Exec("update commentersessions set commenterhex=$1 where commentertoken=$2;", id, token); err != nil {
		logger.Errorf("userService.UpdateCommenterSession: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *userService) UpdateOwner(id models.HexID, name, newPassword string) error {
	logger.Debugf("userService.UpdateOwner(%s, %s, %s)", id, name, newPassword)

	// Prepare a generic user to hash the password
	user := &data.User{HexID: id, Name: name}
	if err := user.SetPassword(newPassword); err != nil {
		return err
	}

	// Update the record
	err := db.Exec(
		"update owners set name=$1, passwordhash=case when $2='' then passwordhash else $2 end where ownerhex=$3;",
		user.Name, user.PasswordHash, user.HexID)
	if err != nil {
		logger.Errorf("userService.UpdateOwner: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

// fetchCommenter returns a new commenter user from the provided database row
func (svc *userService) fetchCommenter(s util.Scanner, readPwdHash bool) (*data.UserCommenter, error) {
	u := data.UserCommenter{}
	var pwdHash, websiteURL, photoURL, provider string
	if err := s.Scan(&u.HexID, &u.Email, &u.Name, &websiteURL, &photoURL, &provider, &u.Created, &pwdHash); err != nil {
		// Log "not found" errors only in debug
		if err != sql.ErrNoRows || logger.IsEnabledFor(logging.DEBUG) {
			logger.Errorf("userService.fetchCommenter: Scan() failed: %v", err)
		}
		return nil, err
	}

	// Apply necessary conversions
	u.WebsiteURL = unfixUndefined(websiteURL)
	u.PhotoURL = unfixUndefined(photoURL)
	u.Provider = unfixIdP(provider)

	// Copy password hash, if requested
	if readPwdHash {
		u.PasswordHash = pwdHash
	}
	return &u, nil
}

// fetchOwner returns a new owner user instance from the provided database row
func (svc *userService) fetchOwner(s util.Scanner, readPwdHash bool) (*data.UserOwner, error) {
	u := data.UserOwner{}
	var pwdHash string
	if err := s.Scan(&u.HexID, &u.Email, &u.Name, &u.EmailConfirmed, &u.Created, &pwdHash); err != nil {
		// Log "not found" errors only in debug
		if err != sql.ErrNoRows || logger.IsEnabledFor(logging.DEBUG) {
			logger.Errorf("userService.fetchOwner: Scan() failed: %v", err)
		}
		return nil, err
	}
	if readPwdHash {
		u.PasswordHash = pwdHash
	}
	return &u, nil
}

// fetchUser returns a new user instance from the provided database row
func (svc *userService) fetchUser(s util.Scanner) (*data.User, error) {
	u := data.User{}
	if err := s.Scan(
		&u.ID,
		&u.Email,
		&u.Name,
		&u.PasswordHash,
		&u.SystemAccount,
		&u.Superuser,
		&u.Confirmed,
		&u.ConfirmedTime,
		&u.CreatedTime,
		&u.UserCreated,
		&u.SignupIP,
		&u.SignupCountry,
		&u.Banned,
		&u.BannedTime,
		&u.UserBanned,
		&u.Remarks,
		&u.FederatedIdP,
		&u.FederatedID,
		&u.Avatar,
		&u.WebsiteURL,
	); err != nil {
		// Log "not found" errors only in debug
		if err != sql.ErrNoRows || logger.IsEnabledFor(logging.DEBUG) {
			logger.Errorf("userService.fetchUser: Scan() failed: %v", err)
		}
		return nil, err
	}
	return &u, nil
}
