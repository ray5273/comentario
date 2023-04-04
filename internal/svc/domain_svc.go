package svc

import (
	"database/sql"
	"github.com/go-openapi/strfmt"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/data"
	"time"
)

// TheDomainService is a global DomainService implementation
var TheDomainService DomainService = &domainService{}

// DomainService is a service interface for dealing with domains
type DomainService interface {
	// Clear removes all pages, comments, and comment votes for the specified domain
	Clear(host models.Host) error
	// Create creates and persists a new domain record
	Create(ownerHex models.HexID, domain *models.Domain) error
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
	// ListByOwner fetches and returns a list of domains for the specified owner
	ListByOwner(ownerHex models.HexID) ([]*models.Domain, error)
	// RegisterView records a domain view in the database. commenterHex should be "anonymous" for an unauthenticated
	// viewer
	RegisterView(host models.Host, commenter *data.UserCommenter) error
	// StatsForComments collects and returns comment statistics for the given domain
	StatsForComments(host models.Host) ([]int64, error)
	// StatsForViews collects and returns view statistics for the given domain
	StatsForViews(host models.Host) ([]int64, error)
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

func (svc *domainService) Clear(host models.Host) error {
	logger.Debugf("domainService.Clear(%s)", host)

	// Remove all votes on domain's comments
	if err := TheVoteService.DeleteByHost(host); err != nil {
		return err
	}

	// Remove all domain's comments
	if err := TheCommentService.DeleteByHost(host); err != nil {
		return err
	}

	// Remove all domain's pages
	if err := ThePageService.DeleteByHost(host); err != nil {
		return err
	}

	// Succeeded
	return nil
}

func (svc *domainService) Create(ownerHex models.HexID, domain *models.Domain) error {
	logger.Debugf("domainService.Create(%s, %#v)", ownerHex, domain)

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

	// Insert a new record
	domain.CreationDate = strfmt.DateTime(time.Now().UTC())
	err := db.Exec(
		"insert into domains"+
			"(ownerhex, domain, name, creationdate, state, autospamfilter, requiremoderation, requireidentification, "+
			"moderateallanonymous, emailnotificationpolicy, commentoprovider, googleprovider, githubprovider, "+
			"gitlabprovider, twitterprovider, ssoprovider, ssourl, defaultsortpolicy) "+
			"values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18);",
		ownerHex, domain.Host, domain.DisplayName, domain.CreationDate, domain.State, domain.AutoSpamFilter,
		domain.RequireModeration, domain.RequireIdentification, domain.ModerateAllAnonymous,
		domain.EmailNotificationPolicy, local, google, github, gitlab, twitter, sso, domain.SsoURL,
		domain.DefaultSortPolicy)
	if err != nil {
		logger.Errorf("domainService.Create: Exec() failed: %v", err)
		return translateDBErrors(err)
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

func (svc *domainService) ListByOwner(ownerHex models.HexID) ([]*models.Domain, error) {
	logger.Debugf("domainService.ListByOwner(%s)", ownerHex)

	// Query domains and moderators
	rows, err := db.Query(
		"select "+
			"d.domain, d.name, d.creationdate, d.state, d.autospamfilter, d.requiremoderation, "+
			"d.requireidentification, d.moderateallanonymous, d.emailnotificationpolicy, d.commentoprovider, "+
			"d.googleprovider, d.githubprovider, d.gitlabprovider, d.twitterprovider, d.ssoprovider, d.ssosecret, "+
			"d.ssourl, d.defaultsortpolicy, coalesce(m.email, ''), coalesce(m.adddate, CURRENT_TIMESTAMP) "+
			"from domains d "+
			"left join moderators m on m.domain=d.domain "+
			"where d.ownerhex=$1;",
		ownerHex)
	if err != nil {
		logger.Errorf("domainService.ListByOwner: Query() failed: %v", err)
		return nil, translateDBErrors(err)
	}
	defer rows.Close()

	// Fetch the domains
	if domains, err := svc.fetchDomainsAndModerators(rows); err != nil {
		return nil, translateDBErrors(err)
	} else {
		return domains, nil
	}
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

func (svc *domainService) StatsForComments(host models.Host) ([]int64, error) {
	logger.Debugf("domainService.StatsForComments(%s)", host)

	// Query the data from the database, grouped by day
	rows, err := db.Query(
		"select count(c.creationdate) "+
			"from (select to_char(date_trunc('day', (current_date-offs)), 'YYYY-MM-DD') as date from generate_series(0, 30, 1) as offs) d "+
			"left join comments c on d.date=to_char(date_trunc('day', c.creationdate), 'YYYY-MM-DD') and c.domain=$1 "+
			"group by d.date "+
			"order by d.date;",
		host)
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

func (svc *domainService) StatsForViews(host models.Host) ([]int64, error) {
	logger.Debugf("domainService.StatsForViews(%s)", host)

	// Query the data from the database, grouped by day
	rows, err := db.Query(
		"select count(v.viewdate) "+
			"from (select to_char(date_trunc('day', (current_date-offs)), 'YYYY-MM-DD') as date from generate_series(0, 30, 1) as offs) d "+
			"left join views v on d.date = to_char(date_trunc('day', v.viewdate), 'YYYY-MM-DD') and v.domain=$1 "+
			"group by d.date "+
			"order by d.date;",
		host)
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

// fetchDomainsAndModerators returns a list of domain instances from the provided database rows
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
