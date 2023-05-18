package svc

import (
	"database/sql"
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
	// ConfirmUser confirms the user's email by their ID
	ConfirmUser(id *uuid.UUID) error
	// CountUsers returns a number of registered users. If includeSystem == false, skips system users
	CountUsers(includeSystem bool) (int, error)
	// CreateDomainUser persists a new domain user (linking a user to a domain)
	CreateDomainUser(du *data.DomainUser) error
	// CreateUser persists a new user
	CreateUser(u *data.User) error
	// CreateUserSession persists a new user session
	CreateUserSession(s *data.UserSession) error
	// DeleteUserByID removes an owner user by their ID
	DeleteUserByID(id *uuid.UUID) error
	// DeleteUserSession removes a user session from the database
	DeleteUserSession(id *uuid.UUID) error
	// FindDomainUserByID fetches and returns a User and DomainUser by domain and user IDs. If the user exists, but
	// there's no record for the user on that domain, returns nil for DomainUser
	FindDomainUserByID(userID, domainID *uuid.UUID) (*data.User, *data.DomainUser, error)
	// FindLocalUserByEmail finds and returns a locally-authenticated user by the given email
	FindLocalUserByEmail(email string) (*data.User, error)
	// FindUserByID finds and returns a user by the given user ID
	FindUserByID(id *uuid.UUID) (*data.User, error)
	// FindUserBySession finds and returns a user by the given user and session ID
	FindUserBySession(userID, sessionID *uuid.UUID) (*data.User, error)
	// IsUserEmailKnown returns whether there's any user present with the given email
	IsUserEmailKnown(email string) (bool, error)
	// ListDomainModerators fetches and returns a list of moderator users for the domain with the given ID. If
	// enabledNotifyOnly is true, only includes users who have moderator notifications enabled for that domain
	ListDomainModerators(domainID *uuid.UUID, enabledNotifyOnly bool) ([]data.User, error)
	// UpdateCommenter updates the given commenter's data in the database. If no idp is provided, the local auth
	// provider is assumed
	// Deprecated
	UpdateCommenter(commenterHex models.HexID, email, name, websiteURL, photoURL, idp string) error
	// UpdateCommenterSession links a commenter token to the given commenter, by updating the session record
	// Deprecated
	UpdateCommenterSession(token, id models.HexID) error
	// UpdateLocalUser updates the given local user's data (name, email, password hash, website URL) in the database
	UpdateLocalUser(user *data.User) error
}

//----------------------------------------------------------------------------------------------------------------------

// userService is a blueprint UserService implementation
type userService struct{}

func (svc *userService) ConfirmUser(id *uuid.UUID) error {
	logger.Debugf("userService.ConfirmUser(%s)", id)

	// Update the owner's record
	if err := db.ExecOne("update cm_users set confirmed=true, ts_confirmed=$1 where id=$2;", time.Now().UTC(), id); err != nil {
		logger.Errorf("userService.ConfirmUser: ExecOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *userService) CountUsers(includeSystem bool) (int, error) {
	logger.Debug("userService.CountUsers(%v)", includeSystem)

	// Prepare the statement
	s := "select count(*) from cm_users"
	if !includeSystem {
		s += " where system_account=false"
	}

	// Query the count
	var i int
	if err := db.QueryRow(s).Scan(&i); err != nil {
		return 0, translateDBErrors(err)
	} else {
		return i, nil
	}
}

func (svc *userService) CreateDomainUser(du *data.DomainUser) error {
	logger.Debugf("userService.CreateDomainUser(%v)", du)

	// Insert a new record
	err := db.Exec(
		"insert into cm_domains_users(domain_id, user_id, is_owner, is_moderator, is_commenter, notify_replies, notify_moderator) "+
			"values($1, $2, $3, $4, $5, $6, $7);",
		du.DomainID, du.UserID, du.IsOwner, du.IsModerator, du.IsCommenter, du.NotifyReplies, du.NotifyModerator)
	if err != nil {
		logger.Errorf("userService.CreateDomainUser: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *userService) CreateUser(u *data.User) error {
	logger.Debugf("userService.CreateUser(%v)", u)

	// Insert a new record
	err := db.Exec(
		"insert into cm_users("+
			"id, email, name, password_hash, system_account, superuser, confirmed, ts_confirmed, ts_created, "+
			"user_created, signup_ip, signup_country, signup_url, banned, ts_banned, user_banned, remarks, "+
			"federated_idp, federated_id, avatar, website_url) "+
			"values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21);",
		u.ID, u.Email, u.Name, u.PasswordHash, u.SystemAccount, u.Superuser, u.Confirmed, u.ConfirmedTime,
		u.CreatedTime, u.UserCreated, config.MaskIP(u.SignupIP), u.SignupCountry, u.SignupURL, u.Banned, u.BannedTime,
		u.UserBanned, u.Remarks, u.FederatedIdP, u.FederatedID, u.Avatar, u.WebsiteURL)
	if err != nil {
		logger.Errorf("userService.CreateUser: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *userService) CreateUserSession(s *data.UserSession) error {
	logger.Debugf("userService.CreateUserSession(%v)", s)

	// Insert a new record
	err := db.Exec(
		"insert into cm_user_sessions("+
			"id, user_id, ts_created, ts_expires, host, proto, ip, country, ua_browser_name, ua_browser_version, "+
			"ua_os_name, ua_os_version, ua_device) "+
			"values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);",
		s.ID, s.UserID, s.CreatedTime, s.ExpiresTime, s.Host, s.Proto, config.MaskIP(s.IP), s.Country, s.BrowserName,
		s.BrowserVersion, s.OSName, s.OSVersion, s.Device)
	if err != nil {
		logger.Errorf("userService.CreateUserSession: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *userService) DeleteUserByID(id *uuid.UUID) error {
	logger.Debugf("userService.DeleteUserByID(%s)", id)

	// Delete the user
	if err := db.ExecOne("delete from cm_users where id=$1;", id); err != nil {
		logger.Errorf("userService.DeleteUserByID: ExecOne() failed: %v", err)
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

func (svc *userService) FindDomainUserByID(userID, domainID *uuid.UUID) (*data.User, *data.DomainUser, error) {
	logger.Debugf("userService.FindDomainUserByID(%s, %s)", userID, domainID)

	// Query the database
	var u data.User
	var du data.DomainUser
	var duUID, duDID *uuid.NullUUID
	if err := db.QueryRow(
		"select "+
			// User fields
			"u.id, u.email, u.name, u.password_hash, u.system_account, u.superuser, u.confirmed, u.ts_confirmed, "+
			"u.ts_created, u.user_created, u.signup_ip, u.signup_country, u.signup_url, u.banned, u.ts_banned, "+
			"u.user_banned, u.remarks, u.federated_idp, u.federated_id, u.avatar, u.website_url, "+
			// DomainUser fields
			"du.domain_id, du.user_id, coalesce(du.is_owner, false), coalesce(du.is_moderator, false), "+
			"coalesce(du.is_commenter, false), coalesce(du.notify_replies, false), "+
			"coalesce(du.notify_moderator, false) "+
			"from cm_users u "+
			"left join cm_domains_users du on du.user_id=u.id and du.domain_id=$1 "+
			"where u.id=$2;",
		userID, domainID,
	).Scan(
		// User
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
		&u.SignupURL,
		&u.Banned,
		&u.BannedTime,
		&u.UserBanned,
		&u.Remarks,
		&u.FederatedIdP,
		&u.FederatedID,
		&u.Avatar,
		&u.WebsiteURL,
		// DomainUser
		&duDID,
		&duUID,
		&du.IsOwner,
		&du.IsModerator,
		&du.IsCommenter,
		&du.NotifyReplies,
		&du.NotifyModerator,
	); err != nil {
		return nil, nil, translateDBErrors(err)
	}

	// If there's a DomainUser available
	var pdu *data.DomainUser
	if duDID.Valid && duUID.Valid {
		du.DomainID = duDID.UUID
		du.UserID = duUID.UUID
		pdu = &du
	}

	// Succeeded
	return &u, pdu, nil
}

func (svc *userService) FindLocalUserByEmail(email string) (*data.User, error) {
	logger.Debugf("userService.FindLocalUserByEmail(%s)", email)

	// Query the database
	row := db.QueryRow(
		"select "+
			"u.id, u.email, u.name, u.password_hash, u.system_account, u.superuser, u.confirmed, u.ts_confirmed, "+
			"u.ts_created, u.user_created, u.signup_ip, u.signup_country, u.signup_url, u.banned, u.ts_banned, "+
			"u.user_banned, u.remarks, u.federated_idp, u.federated_id, u.avatar, u.website_url "+
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

func (svc *userService) FindUserByID(id *uuid.UUID) (*data.User, error) {
	logger.Debugf("userService.FindUserByID(%s)", id)

	// Query the database
	row := db.QueryRow(
		"select "+
			"u.id, u.email, u.name, u.password_hash, u.system_account, u.superuser, u.confirmed, u.ts_confirmed, "+
			"u.ts_created, u.user_created, u.signup_ip, u.signup_country, u.signup_url, u.banned, u.ts_banned, "+
			"u.user_banned, u.remarks, u.federated_idp, u.federated_id, u.avatar, u.website_url "+
			"from cm_users u "+
			"where u.id=$1;",
		id)

	// Fetch the user
	if u, err := svc.fetchUser(row); err != nil {
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
			"u.ts_created, u.user_created, u.signup_ip, u.signup_country, u.signup_url, u.banned, u.ts_banned, "+
			"u.user_banned, u.remarks, u.federated_idp, u.federated_id, u.avatar, u.website_url "+
			"from cm_users u "+
			"join cm_user_sessions s on s.user_id=u.id"+
			"where u.id=$1 and s.id=$2 and s.ts_created<$3 and s.ts_expires>=$3;",
		userID, sessionID, time.Now().UTC())

	// Fetch the user
	if u, err := svc.fetchUser(row); err != nil {
		return nil, translateDBErrors(err)
	} else {
		return u, nil
	}
}

func (svc *userService) IsUserEmailKnown(email string) (bool, error) {
	logger.Debugf("userService.IsUserEmailKnown(%s)", email)
	row := db.QueryRow("select exists(select 1 from cm_users where email=$1);", email)
	var b bool
	if err := row.Scan(&b); err != nil {
		return false, translateDBErrors(err)
	} else {
		return b, nil
	}
}

func (svc *userService) ListDomainModerators(domainID *uuid.UUID, enabledNotifyOnly bool) ([]data.User, error) {
	logger.Debugf("userService.ListDomainModerators(%s, %v)", domainID, enabledNotifyOnly)

	// Query domain's moderator users
	s := "select " +
		"u.id, u.email, u.name, u.password_hash, u.system_account, u.superuser, u.confirmed, u.ts_confirmed, " +
		"u.ts_created, u.user_created, u.signup_ip, u.signup_country, u.signup_url, u.banned, u.ts_banned, " +
		"u.user_banned, u.remarks, u.federated_idp, u.federated_id, u.avatar, u.website_url " +
		"from cm_domains_users du " +
		"join cm_users u on u.id=du.user_id " +
		"where du.domain_id=$1 and (du.is_owner or du.is_moderator)"
	if enabledNotifyOnly {
		s += " and du.notify_moderator"
	}
	rows, err := db.Query(s+";", domainID)
	if err != nil {
		logger.Errorf("userService.ListDomainModerators: Query() failed: %v", err)
		return nil, translateDBErrors(err)
	}
	defer rows.Close()

	// Fetch the users
	var res []data.User
	for rows.Next() {
		if u, err := svc.fetchUser(rows); err != nil {
			return nil, translateDBErrors(err)
		} else {
			res = append(res, *u)
		}
	}

	// Verify Next() didn't error
	if err := rows.Err(); err != nil {
		logger.Errorf("userService.ListDomainModerators: rows.Next() failed: %v", err)
		return nil, err
	}

	// Succeeded
	return res, nil
}

func (svc *userService) UpdateCommenter(commenterHex models.HexID, email, name, websiteURL, photoURL, idp string) error {
	logger.Debugf("userService.UpdateCommenter(%s, %s, %s, %s, %s, %s)", commenterHex, email, name, websiteURL, photoURL, idp)
	/* TODO new-db

	// Update the database record
	err := db.Exec(
		"update commenters set email=$1, name=$2, link=$3, photo=$4 where commenterhex=$5 and provider=$6;",
		email, name, fixUndefined(websiteURL), fixUndefined(photoURL), commenterHex, fixIdP(idp))
	if err != nil {
		logger.Errorf("userService.UpdateCommenter: Exec() failed: %v", err)
		return translateDBErrors(err)
	}
	*/
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

func (svc *userService) UpdateLocalUser(user *data.User) error {
	logger.Debugf("userService.UpdateLocalUser(%v)", user)

	// Update the record
	if err := db.ExecOne(
		"update cm_users set email=$1, name=$2, password_hash=$3, website_url=$4 where id=$5 and federated_idp is null;",
		user.Email, user.Name, user.PasswordHash, user.WebsiteURL, &user.ID,
	); err != nil {
		logger.Errorf("userService.UpdateLocalUser: ExecOne() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
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
		&u.SignupURL,
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
