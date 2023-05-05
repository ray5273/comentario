package svc

import (
	"database/sql"
	"github.com/go-openapi/strfmt"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/util"
	"strings"
	"time"
)

// TheDomainService is a global DomainService implementation
var TheDomainService DomainService = &domainService{}

// DomainService is a service interface for dealing with domains
type DomainService interface {
	// ClearByID removes all dependent objects (users, pages, comments, votes etc.) for the specified domain by its ID
	ClearByID(id *uuid.UUID) error
	// DeleteByID removes the domain with all dependent objects (users, pages, comments, votes etc.) for the specified
	// domain by its ID
	DeleteByID(id *uuid.UUID) error
	// FindByID fetches and returns a domain by its ID
	FindByID(id *uuid.UUID) (*data.Domain, error)
	// FindDomainUser fetches and returns a Domain and DomainUser by domain and user IDs. If the domain exists, but
	// there's no record for the user on that domain, returns nil for DomainUser
	FindDomainUser(domainID, userID *uuid.UUID) (*data.Domain, *data.DomainUser, error)
	// ListByOwnerID fetches and returns a list of domains for the specified owner
	ListByOwnerID(userID *uuid.UUID) ([]data.Domain, error)
	// ListDomainFederatedIdPs fetches and returns a list of federated identity providers enabled for the domain with
	// the given ID
	ListDomainFederatedIdPs(domainID *uuid.UUID) ([]models.FederatedIdpID, error)
	// Create creates and persists a new domain record
	Create(userID *uuid.UUID, domain *data.Domain, idps []models.FederatedIdpID) error

	///////////////////////////////////////// TODO OLD Methods
	// CreateModerator creates and persists a new domain moderator record
	CreateModerator(host models.Host, email string) (*models.DomainModerator, error)
	// CreateSSOSecret generates a new SSO secret token for the given domain and saves that in the domain properties
	CreateSSOSecret(host models.Host) (models.HexID, error)
	// CreateSSOToken generates, persists, and returns a new SSO token for the given domain and commenter token
	CreateSSOToken(host models.Host, commenterToken models.HexID) (models.HexID, error)
	// Delete deletes the specified domain
	Delete(host models.Host) error
	// DeleteModerator deletes the specified domain moderator
	DeleteModerator(host models.Host, email string) error
	// FindByHost fetches and returns a domain with the specified host
	FindByHost(host models.Host) (*models.Domain, error)
	// IsDomainModerator returns whether the given email is a moderator in the given domain
	IsDomainModerator(email string, host models.Host) (bool, error)
	// IsDomainOwner returns whether the given owner hex ID is an owner of the given domain
	IsDomainOwner(id models.HexID, host models.Host) (bool, error)
	// RegisterView records a domain view in the database. commenterHex should be "anonymous" for an unauthenticated
	// viewer
	RegisterView(host models.Host, commenter *data.UserCommenter) error
	// StatsForComments collects and returns comment statistics for the given domain and number of days. If no host is
	// given, statistics is collected for all domains owner by the user
	StatsForComments(host models.Host, ownerID models.HexID, numDays int) ([]int64, error)
	// StatsForOwner collects and returns overall statistics for all domains of the specified owner
	StatsForOwner(ownerHex models.HexID) (countDomains, countPages, countComments, countCommenters int64, err error)
	// StatsForViews collects and returns view statistics for the given domain and number of days. If no host is given,
	// statistics is collected for all domains owner by the user
	StatsForViews(host models.Host, ownerID models.HexID, numDays int) ([]int64, error)
	// TakeSSOToken queries and removes the provided token from the database, returning its host and commenter token
	TakeSSOToken(token models.HexID) (models.Host, models.HexID, error)
	// ToggleFrozen switches the frozen status to unfrozen, and vice versa, for the given domain
	ToggleFrozen(host models.Host) error
	// Update updates the domain record in the database
	Update(domain *models.Domain) error
}

//----------------------------------------------------------------------------------------------------------------------

// domainService is a blueprint DomainService implementation
type domainService struct{}

func (svc *domainService) ClearByID(id *uuid.UUID) error {
	logger.Debugf("domainService.ClearByID(%v)", id)

	err := checkErrors(
		db.Exec("delete from cm_domain_users where domain_id=$1;", id),
		db.Exec("delete from cm_domain_pages where domain_id=$1;", id))
	if err != nil {
		logger.Errorf("domainService.ClearByID: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) Create(userID *uuid.UUID, domain *data.Domain, idps []models.FederatedIdpID) error {
	logger.Debugf("domainService.Create(%s, %#v, %v)", userID, domain, idps)

	// Insert a new domain record
	err := db.Exec(
		"insert into cm_domains("+
			"id, name, host, ts_created, is_readonly, auth_anonymous, auth_local, auth_sso, sso_url, sso_secret, moderation_policy, mod_notify_policy, default_sort) "+
			"values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);",
		&domain.ID, domain.Name, domain.Host, domain.CreatedTime, domain.IsReadonly, domain.AuthAnonymous,
		domain.AuthLocal, domain.AuthSso, domain.SsoURL, domain.SsoSecret, domain.ModerationPolicy,
		domain.ModNotifyPolicy, domain.DefaultSort)
	if err != nil {
		logger.Errorf("domainService.Create: Exec() failed for domain: %v", err)
		return translateDBErrors(err)
	}

	// Insert a new domain owner record
	err = db.Exec(
		"insert into cm_domains_users(domain_id, user_id, is_owner, is_moderator, is_commenter, notify_replies, notify_moderator) "+
			"values($1, $2, true, true, true, true, true);",
		&domain.ID, userID)
	if err != nil {
		logger.Errorf("domainService.Create: Exec() failed for domain user: %v", err)
		return translateDBErrors(err)
	}

	// Insert domain IdP records, if any
	if len(idps) > 0 {
		var vals []string
		var params []any
		for _, id := range idps {
			vals = append(vals, "(?,?)")
			params = append(params, &domain.ID, id)
		}
		err = db.Exec(
			"insert into cm_domains_idps(domain_id, fed_idp_id) values"+strings.Join(vals, ",")+";",
			params...)
		if err != nil {
			logger.Errorf("domainService.Create: Exec() failed for domain IdPs: %v", err)
			return translateDBErrors(err)
		}
	}

	// Succeeded
	return nil
}

func (svc *domainService) CreateModerator(host models.Host, email string) (*models.DomainModerator, error) {
	logger.Debugf("domainService.CreateModerator(%s, %s)", host, email)

	// Create a new email record
	if _, err := TheEmailService.Create(email); err != nil {
		return nil, err
	}

	// Create a new domain moderator record
	dm := models.DomainModerator{
		AddDate: strfmt.DateTime(time.Now().UTC()),
		Host:    host,
		Email:   strfmt.Email(email),
	}
	err := db.Exec("insert into moderators(domain, email, adddate) values($1, $2, $3);", dm.Host, dm.Email, dm.AddDate)
	if err != nil {
		logger.Errorf("domainService.CreateModerator: Exec() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Succeeded
	return &dm, nil
}

func (svc *domainService) CreateSSOSecret(host models.Host) (models.HexID, error) {
	logger.Debugf("domainService.CreateSSOSecret(%s)", host)

	// Generate a new token
	token, err := data.RandomHexID()
	if err != nil {
		logger.Errorf("userService.CreateSSOSecret: RandomHexID() failed: %v", err)
		return "", err
	}

	// Update the domain record
	if err = db.Exec("update domains set ssosecret=$1 where domain=$2;", token, host); err != nil {
		logger.Errorf("domainService.CreateSSOSecret: Exec() failed: %v", err)
		return "", translateDBErrors(err)
	}

	// Succeeded
	return token, nil
}

func (svc *domainService) CreateSSOToken(host models.Host, commenterToken models.HexID) (models.HexID, error) {
	logger.Debugf("domainService.CreateSSOToken(%s, %s)", host, commenterToken)

	// Generate a new token
	token, err := data.RandomHexID()
	if err != nil {
		logger.Errorf("userService.CreateSSOToken: RandomHexID() failed: %v", err)
		return "", err
	}

	// Insert a new token record
	err = db.Exec(
		"insert into ssotokens(token, domain, commentertoken, creationdate) values($1, $2, $3, $4);",
		token, host, commenterToken, time.Now().UTC())
	if err != nil {
		logger.Errorf("domainService.CreateSSOToken: Exec() failed: %v", err)
		return "", translateDBErrors(err)
	}

	// Succeeded
	return token, nil
}

func (svc *domainService) Delete(host models.Host) error {
	logger.Debugf("domainService.Delete(%s)", host)

	// Remove the domain's view stats, moderators, ssotokens
	err := checkErrors(
		db.Exec("delete from views where domain=$1;", host),
		db.Exec("delete from moderators where domain=$1;", host),
		db.Exec("delete from ssotokens where domain=$1;", host))
	if err != nil {
		logger.Errorf("domainService.Delete: Exec() failed for dependent object: %v", err)
		return translateDBErrors(err)
	}

	// Remove the domain itself
	if err := db.Exec("delete from domains where domain=$1;", host); err != nil {
		logger.Errorf("domainService.Delete: Exec() failed for domain: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) DeleteByID(id *uuid.UUID) error {
	logger.Debugf("domainService.DeleteByID(%v)", id)

	err := db.Exec("delete from cm_domains where id=$1;", id)
	if err != nil {
		logger.Errorf("domainService.DeleteByID: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) DeleteModerator(host models.Host, email string) error {
	logger.Debugf("domainService.DeleteModerator(%s, %s)", host, email)

	// Remove the row from the database
	if err := db.Exec("delete from moderators where domain=$1 and email=$2;", host, email); err != nil {
		logger.Errorf("domainService.DeleteModerator: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) FindByHost(host models.Host) (*models.Domain, error) {
	logger.Debugf("domainService.FindByHost(%s)", host)

	// Query the row
	rows, err := db.Query(
		"select "+
			"d.domain, d.name, d.creationdate, d.state, d.autospamfilter, d.requiremoderation, "+
			"d.requireidentification, d.moderateallanonymous, d.emailnotificationpolicy, d.commentoprovider, "+
			"d.googleprovider, d.githubprovider, d.gitlabprovider, d.twitterprovider, d.ssoprovider, d.ssosecret, "+
			"d.ssourl, d.defaultsortpolicy, coalesce(m.email, ''), coalesce(m.adddate, CURRENT_TIMESTAMP) "+
			"from domains d "+
			"left join moderators m on m.domain=d.domain "+
			"where d.domain=$1;",
		host)
	if err != nil {
		logger.Errorf("domainService.FindByHost: Query() failed: %v", err)
		return nil, translateDBErrors(err)
	}
	defer rows.Close()

	// Fetch the domain(s)
	if domains, err := svc.fetchDomainsAndModerators(rows); err != nil {
		return nil, translateDBErrors(err)
	} else if len(domains) == 0 {
		return nil, ErrNotFound
	} else {
		// Grab the first one
		return domains[0], nil
	}
}

func (svc *domainService) FindByID(id *uuid.UUID) (*data.Domain, error) {
	logger.Debugf("domainService.FindByID(%s)", id)

	// Query the row
	row := db.QueryRow(
		"select "+
			"d.id, d.name, d.host, d.ts_created, d.is_readonly, d.auth_anonymous, d.auth_local, d.auth_sso, "+
			"d.sso_url, d.sso_secret, d.moderation_policy, d.mod_notify_policy, d.default_sort, d.count_comments, "+
			"d.count_views "+
			"from cm_domains d "+
			"where d.id=$1;",
		id)

	// Fetch the domain
	if d, err := svc.fetchDomain(row); err != nil {
		return nil, translateDBErrors(err)
	} else {
		return d, nil
	}
}

func (svc *domainService) FindDomainUser(domainID, userID *uuid.UUID) (*data.Domain, *data.DomainUser, error) {
	logger.Debugf("domainService.FindDomainUser(%s)", domainID, userID)

	// Query the row
	row := db.QueryRow(
		"select "+
			"d.id, d.name, d.host, d.ts_created, d.is_readonly, d.auth_anonymous, d.auth_local, d.auth_sso, "+
			"d.sso_url, d.sso_secret, d.moderation_policy, d.mod_notify_policy, d.default_sort, d.count_comments, "+
			"d.count_views, du.user_id, coalesce(du.is_owner, false), coalesce(du.is_moderator, false), "+
			"coalesce(du.is_commenter, false), coalesce(du.notify_replies, false), coalesce(du.notify_moderator, false) "+
			"from cm_domains d "+
			"left join cm_domains_users du on du.domain_id=$1 and du.user_id=$2 "+
			"where d.id=$1;",
		domainID, userID)

	// Fetch the domain and the domain user
	var d data.Domain
	var du data.DomainUser
	var uid uuid.NullUUID
	err := row.Scan(
		&d.ID,
		&d.Name,
		&d.Host,
		&d.CreatedTime,
		&d.IsReadonly,
		&d.AuthAnonymous,
		&d.AuthLocal,
		&d.AuthSso,
		&d.SsoURL,
		&d.SsoSecret,
		&d.ModerationPolicy,
		&d.ModNotifyPolicy,
		&d.DefaultSort,
		&d.CountComments,
		&d.CountViews,
		&uid,
		&du.IsOwner,
		&du.IsModerator,
		&du.IsCommenter,
		&du.NotifyReplies,
		&du.NotifyModerator)
	if err != nil {
		logger.Errorf("domainService.FindDomainUser: Scan() failed: %v", err)
		return nil, nil, err
	}

	// If no record found for the domain user, we'll return nil
	var pdu *data.DomainUser
	if uid.Valid {
		pdu = &du
	}

	// Succeeded
	return &d, pdu, nil
}

func (svc *domainService) IsDomainModerator(email string, host models.Host) (bool, error) {
	logger.Debugf("domainService.IsDomainModerator(%s, %s)", email, host)

	// Query the row
	row := db.QueryRow("select 1 from moderators where domain=$1 and email=$2;", host, email)
	var b byte
	if err := row.Scan(&b); err == sql.ErrNoRows {
		// No rows means it isn't a moderator
		return false, nil

	} else if err != nil {
		// Any other database error
		logger.Errorf("domainService.IsDomainModerator: QueryRow() failed: %v", err)
		return false, translateDBErrors(err)
	}

	// Succeeded: the email belongs to a domain moderator
	return true, nil
}

func (svc *domainService) IsDomainOwner(id models.HexID, host models.Host) (bool, error) {
	logger.Debugf("domainService.IsDomainOwner(%s, %s)", id, host)

	// Query the row
	row := db.QueryRow("select 1 from domains where ownerhex=$1 and domain=$2", id, host)
	var b byte
	if err := row.Scan(&b); err == sql.ErrNoRows {
		// No rows means it isn't an owner
		return false, nil

	} else if err != nil {
		// Any other database error
		logger.Errorf("domainService.IsDomainOwner: QueryRow() failed: %v", err)
		return false, translateDBErrors(err)
	}

	// Succeeded: the ID belongs to a domain owner
	return true, nil
}

func (svc *domainService) ListByOwnerID(userID *uuid.UUID) ([]data.Domain, error) {
	logger.Debugf("domainService.ListByOwnerID(%s)", userID)

	// Query domains
	rows, err := db.Query(
		"select "+
			"d.id, d.name, d.host, d.ts_created, d.is_readonly, d.auth_anonymous, d.auth_local, d.auth_sso, "+
			"d.sso_url, d.sso_secret, d.moderation_policy, d.mod_notify_policy, d.default_sort, d.count_comments, "+
			"d.count_views "+
			"from cm_domains d "+
			"where d.id in (select du.domain_id from cm_domain_users du where du.user_id=$1 and (du.is_owner or du.is_moderator));",
		userID)
	if err != nil {
		logger.Errorf("domainService.ListByOwnerID: Query() failed: %v", err)
		return nil, translateDBErrors(err)
	}

	// Fetch the domains
	if domains, err := svc.fetchDomains(rows); err != nil {
		return nil, translateDBErrors(err)
	} else {
		return domains, nil
	}
}

func (svc *domainService) ListDomainFederatedIdPs(domainID *uuid.UUID) ([]models.FederatedIdpID, error) {
	logger.Debugf("domainService.ListDomainFederatedIdPs(%s)", domainID)

	// Query domain's IdPs
	rows, err := db.Query("select fed_idp_id from cm_domains_idps where domain_id=$1;", domainID)
	if err != nil {
		logger.Errorf("domainService.ListDomainFederatedIdPs: Query() failed: %v", err)
		return nil, translateDBErrors(err)
	}
	defer rows.Close()

	// Fetch the IDs
	var res []models.FederatedIdpID
	for rows.Next() {
		var id models.FederatedIdpID
		if err := rows.Scan(&id); err != nil {
			logger.Errorf("domainService.ListDomainFederatedIdPs: rows.Scan() failed: %v", err)
			return nil, err
		}
		res = append(res, id)
	}

	// Verify Next() didn't error
	if err := rows.Err(); err != nil {
		logger.Errorf("domainService.ListDomainFederatedIdPs: rows.Next() failed: %v", err)
		return nil, err
	}

	// Succeeded
	return res, nil
}

func (svc *domainService) RegisterView(host models.Host, commenter *data.UserCommenter) error {
	logger.Debugf("domainService.RegisterView(%s, [%s])", host, commenter.HexID)

	// Insert a new view record
	err := db.Exec(
		"insert into views(domain, commenterhex, viewdate) values ($1, $2, $3);",
		host, fixCommenterHex(commenter.HexID), time.Now().UTC())
	if err != nil {
		logger.Warningf("domainService.RegisterView: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) StatsForComments(host models.Host, ownerID models.HexID, numDays int) ([]int64, error) {
	logger.Debugf("domainService.StatsForComments(%s, %s, %d)", host, ownerID, numDays)

	// Correct the number of days if needed
	if numDays > util.MaxNumberStatsDays {
		numDays = util.MaxNumberStatsDays
	}

	// Query the data from the database, grouped by day
	rows, err := db.Query(
		"select count(c.creationdate) "+
			"from (select date_trunc('day', current_date-x) as d1, date_trunc('day', current_date-x+1) as d2 from generate_series(0, $1) as x) d "+
			"left join comments c on c.creationdate >= d.d1 and c.creationdate < d.d2 and ($2='' or c.domain=$2) and c.domain in (select domain from domains where ownerhex=$3) "+
			"group by d.d1 "+
			"order by d.d1;",
		numDays-1, host, ownerID)
	if err != nil {
		logger.Errorf("domainService.StatsForComments: Query() failed: %v", err)
		return nil, translateDBErrors(err)
	}
	defer rows.Close()

	// Collect the data
	if res, err := svc.fetchStats(rows); err != nil {
		return nil, translateDBErrors(err)
	} else {
		// Succeeded
		return res, nil
	}
}

func (svc *domainService) StatsForOwner(ownerHex models.HexID) (countDomains, countPages, countComments, countCommenters int64, err error) {
	logger.Debugf("domainService.StatsForOwner(%s)", ownerHex)

	// Query domain and page counts
	rdp := db.QueryRow(
		"select count(distinct d.*), count(p.*) "+
			"from domains d "+
			"left join pages p on p.domain = d.domain "+
			"where d.ownerhex=$1",
		ownerHex)
	if err = rdp.Scan(&countDomains, &countPages); err != nil {
		// Any other database error
		logger.Errorf("domainService.StatsForOwner: QueryRow() for domains/pages failed: %v", err)
		return 0, 0, 0, 0, translateDBErrors(err)
	}

	// Query comment and commenter counts
	rcc := db.QueryRow(
		"select count(*), count(distinct commenterhex) "+
			"from comments "+
			"where domain in (select domain from domains where ownerhex=$1)",
		ownerHex)
	if err = rcc.Scan(&countComments, &countCommenters); err != nil {
		// Any other database error
		logger.Errorf("domainService.StatsForOwner: QueryRow() for comments/commenters failed: %v", err)
		return 0, 0, 0, 0, translateDBErrors(err)
	}

	// Succeeded
	return
}

func (svc *domainService) StatsForViews(host models.Host, ownerID models.HexID, numDays int) ([]int64, error) {
	logger.Debugf("domainService.StatsForViews(%s, %s, %d)", host, ownerID, numDays)

	// Correct the number of days if needed
	if numDays > util.MaxNumberStatsDays {
		numDays = util.MaxNumberStatsDays
	}

	// Query the data from the database, grouped by day
	rows, err := db.Query(
		"select count(v.viewdate) "+
			"from (select date_trunc('day', current_date-x) as d1, date_trunc('day', current_date-x+1) as d2 from generate_series(0, $1) as x) d "+
			"left join views v on v.viewdate >= d.d1 and v.viewdate < d.d2 and ($2='' or v.domain=$2) and v.domain in (select domain from domains where ownerhex=$3) "+
			"group by d.d1 "+
			"order by d.d1;",
		numDays-1, host, ownerID)
	if err != nil {
		logger.Errorf("domainService.StatsForViews: Query() failed: %v", err)
		return nil, translateDBErrors(err)
	}
	defer rows.Close()

	// Collect the data
	if res, err := svc.fetchStats(rows); err != nil {
		return nil, translateDBErrors(err)
	} else {
		// Succeeded
		return res, nil
	}
}

func (svc *domainService) TakeSSOToken(token models.HexID) (models.Host, models.HexID, error) {
	logger.Debugf("domainService.TakeSSOToken(%s)", token)

	// Fetch and delete the token
	row := db.QueryRow("delete from ssotokens where token=$1 returning domain, commentertoken;", token)
	var host models.Host
	var commenterToken models.HexID
	if err := row.Scan(&host, &commenterToken); err != nil {
		logger.Errorf("domainService.TakeSSOToken: Scan() failed: %v", err)
		return "", "", translateDBErrors(err)
	}

	// Succeeded
	return host, commenterToken, nil
}

func (svc *domainService) ToggleFrozen(host models.Host) error {
	logger.Debugf("domainService.ToggleFrozen(%s)", host)

	// Update the domain
	err := db.Exec(
		"update domains set state=case when state=$1 then $2 else $1 end where domain=$3;",
		models.DomainStateFrozen, models.DomainStateUnfrozen, host)
	if err != nil {
		logger.Errorf("domainService.ToggleFrozen: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) Update(domain *models.Domain) error {
	logger.Debug("domainService.Update(...)")

	// Prepare IdP settings
	var local, google, github, gitlab, twitter, sso bool
	for _, id := range domain.Idps {
		switch id {
		case models.IdentityProviderIDEmpty:
			local = true
		case models.IdentityProviderIDGoogle:
			google = true
		case models.IdentityProviderIDGithub:
			github = true
		case models.IdentityProviderIDGitlab:
			gitlab = true
		case models.IdentityProviderIDTwitter:
			twitter = true
		case models.IdentityProviderIDSso:
			sso = true
		}
	}

	// Update the domain
	err := db.Exec(
		"update domains "+
			"set name=$1, state=$2, autospamfilter=$3, requiremoderation=$4, requireidentification=$5, "+
			"moderateallanonymous=$6, emailnotificationpolicy=$7, commentoprovider=$8, googleprovider=$9, "+
			"githubprovider=$10, gitlabprovider=$11, twitterprovider=$12, ssoprovider=$13, ssourl=$14, "+
			"defaultsortpolicy=$15 "+
			"where domain=$16;",
		domain.DisplayName,
		domain.State,
		domain.AutoSpamFilter,
		domain.RequireModeration,
		domain.RequireIdentification,
		domain.ModerateAllAnonymous,
		domain.EmailNotificationPolicy,
		local,
		google,
		github,
		gitlab,
		twitter,
		sso,
		domain.SsoURL,
		domain.DefaultSortPolicy,
		domain.Host)
	if err != nil {
		logger.Errorf("domainService.Update: Exec() failed: %v", err)
		return translateDBErrors(err)
	}

	// Succeeded
	return nil
}

// fetchDomain fetches and returns a domain instance from the provided database row
func (svc *domainService) fetchDomain(row *sql.Row) (*data.Domain, error) {
	var d data.Domain
	err := row.Scan(
		&d.ID,
		&d.Name,
		&d.Host,
		&d.CreatedTime,
		&d.IsReadonly,
		&d.AuthAnonymous,
		&d.AuthLocal,
		&d.AuthSso,
		&d.SsoURL,
		&d.SsoSecret,
		&d.ModerationPolicy,
		&d.ModNotifyPolicy,
		&d.DefaultSort,
		&d.CountComments,
		&d.CountViews)
	if err != nil {
		logger.Errorf("domainService.fetchDomain: Scan() failed: %v", err)
		return nil, err
	}

	// Succeeded
	return &d, nil
}

// fetchDomains fetches and returns a list domain instances from the provided database rows
func (svc *domainService) fetchDomains(rows *sql.Rows) ([]data.Domain, error) {
	defer rows.Close()

	// Iterate all rows
	var res []data.Domain
	for rows.Next() {
		var d data.Domain
		err := rows.Scan(
			&d.ID,
			&d.Name,
			&d.Host,
			&d.CreatedTime,
			&d.IsReadonly,
			&d.AuthAnonymous,
			&d.AuthLocal,
			&d.AuthSso,
			&d.SsoURL,
			&d.SsoSecret,
			&d.ModerationPolicy,
			&d.ModNotifyPolicy,
			&d.DefaultSort,
			&d.CountComments,
			&d.CountViews)
		if err != nil {
			logger.Errorf("domainService.fetchDomains: Scan() failed: %v", err)
			return nil, err
		}
		res = append(res, d)
	}

	// Verify Next() didn't error
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Succeeded
	return res, nil
}

// fetchDomainsAndModerators returns a list of domain instances from the provided database rows
// Deprecated
func (svc *domainService) fetchDomainsAndModerators(rs *sql.Rows) ([]*models.Domain, error) {
	// Maintain a map of domains by host
	dn := map[models.Host]*models.Domain{}
	var res []*models.Domain

	// Iterate all rows
	for rs.Next() {
		// Fetch a domain and a moderator
		d := models.Domain{}
		m := models.DomainModerator{}
		var local, google, github, gitlab, twitter, sso bool
		err := rs.Scan(
			&d.Host,
			&d.DisplayName,
			&d.CreationDate,
			&d.State,
			&d.AutoSpamFilter,
			&d.RequireModeration,
			&d.RequireIdentification,
			&d.ModerateAllAnonymous,
			&d.EmailNotificationPolicy,
			&local,
			&google,
			&github,
			&gitlab,
			&twitter,
			&sso,
			&d.SsoSecret,
			&d.SsoURL,
			&d.DefaultSortPolicy,
			&m.Email,
			&m.AddDate)
		if err != nil {
			logger.Warningf("domainService.fetchDomainsAndModerators: Scan() failed: %v", err)
			return nil, err
		}

		// If the domain isn't encountered yet
		var domain *models.Domain
		var exists bool
		if domain, exists = dn[d.Host]; !exists {
			domain = &d

			// Compile a list of identity providers
			if local {
				d.Idps = append(d.Idps, models.IdentityProviderIDEmpty)
			}
			if sso {
				d.Idps = append(d.Idps, models.IdentityProviderIDSso)
			}

			// Federated IdPs
			var fidps []models.IdentityProviderID
			if google {
				fidps = append(fidps, models.IdentityProviderIDGoogle)
			}
			if github {
				fidps = append(fidps, models.IdentityProviderIDGithub)
			}
			if gitlab {
				fidps = append(fidps, models.IdentityProviderIDGitlab)
			}
			if twitter {
				fidps = append(fidps, models.IdentityProviderIDTwitter)
			}
			for _, id := range fidps {
				if _, ok := data.FederatedIdProviders[id]; ok {
					d.Idps = append(d.Idps, id)
				}
			}

			// Add the domain to the result list and the name map
			res = append(res, domain)
			dn[d.Host] = domain
		}

		// Add the current moderator, if any, to the domain moderators
		if m.Email != "" {
			m.Host = domain.Host
			domain.Moderators = append(domain.Moderators, &m)
		}
	}

	// Check if Next() didn't error
	if err := rs.Err(); err != nil {
		return nil, err
	}

	// Succeeded
	return res, nil
}

// fetchStats collects and returns a daily statistics using the provided database rows
func (svc *domainService) fetchStats(rs *sql.Rows) ([]int64, error) {
	// Collect the data
	var res []int64
	for rs.Next() {
		var i int64
		if err := rs.Scan(&i); err != nil {
			logger.Errorf("domainService.fetchStats: rs.Scan() failed: %v", err)
			return nil, err
		}
		res = append(res, i)
	}

	// Check that Next() didn't error
	if err := rs.Err(); err != nil {
		return nil, err
	}

	// Succeeded
	return res, nil
}
