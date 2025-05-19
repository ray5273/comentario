package svc

import (
	"database/sql"
	"github.com/doug-martin/goqu/v9"
	"github.com/doug-martin/goqu/v9/exp"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/extend/plugin"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/config"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/persistence"
	"gitlab.com/comentario/comentario/internal/util"
	"sort"
	"strings"
)

// DomainService is a service interface for dealing with domains
type DomainService interface {
	// ClearByID removes most dependent objects (pages, comments, votes, views, but not users) for the specified domain
	// by its ID
	ClearByID(id *uuid.UUID) error
	// CountForUser returns the number of domains the specified user has access to, with specific roles
	//  - owner indicates whether to only include domains owned by the user (ignored if moderator == true)
	//  - moderator indicates whether to only include domains where the user is a moderator
	CountForUser(userID *uuid.UUID, owner, moderator bool) (int, error)
	// Create creates and persists a new domain record
	Create(userID *uuid.UUID, domain *data.Domain) error
	// DeleteByID removes the domain with all dependent objects (users, pages, comments, votes etc.) for the specified
	// domain by its ID
	DeleteByID(id *uuid.UUID) error
	// FindByHost fetches and returns a domain by its host
	FindByHost(host string) (*data.Domain, error)
	// FindByID fetches and returns a domain by its ID
	FindByID(id *uuid.UUID) (*data.Domain, error)
	// FindDomainUserByHost fetches and returns a Domain and DomainUser by domain host and user ID. If the domain
	// exists, but there's no record for the user on that domain:
	//  - if createIfMissing == true, creates a new domain user and returns it
	//  - if createIfMissing == false, returns nil for DomainUser
	FindDomainUserByHost(host string, userID *uuid.UUID, createIfMissing bool) (*data.Domain, *data.DomainUser, error)
	// FindDomainUserByID fetches and returns a Domain and DomainUser by domain and user IDs. If the domain exists, but
	// there's no record for the user on that domain:
	//  - if createIfMissing == true, creates a new domain user and returns it
	//  - if createIfMissing == false, returns nil for DomainUser
	FindDomainUserByID(domainID, userID *uuid.UUID, createIfMissing bool) (*data.Domain, *data.DomainUser, error)
	// GenerateSSOSecret (re)generates a new SSO secret token for the given domain and saves that in domain properties
	GenerateSSOSecret(domainID *uuid.UUID) (string, error)
	// IncrementCounts increments (or decrements if the value is negative) the domain's comment/view counts
	IncrementCounts(domainID *uuid.UUID, incComments, incViews int) error
	// ListByDomainUser fetches and returns a list of domains the current user has any rights to, and a list of domain
	// users in relation to the specified user.
	//   - userID is the user to return domain users for.
	//   - curUserID is the current user: only those domain this user is registered for are returned, unless superuser == true.
	//   - If superuser == true, includes all domains, effectively ignoring curUserID.
	//   - If withDomainUserOnly == true, returns only domains a domain user record for userID exists for
	//   - filter is an optional substring to filter the result by.
	//   - sortBy is an optional property name to sort the result by. If empty, sorts by the host.
	//   - dir is the sort direction.
	//   - pageIndex is the page index, if negative, no pagination is applied.
	ListByDomainUser(userID, curUserID *uuid.UUID, superuser, withDomainUserOnly bool, filter, sortBy string, dir data.SortDirection, pageIndex int) ([]*data.Domain, []*data.DomainUser, error)
	// ListDomainExtensions fetches and returns a list of extensions enabled for the domain with the given ID
	ListDomainExtensions(domainID *uuid.UUID) ([]*data.DomainExtension, error)
	// ListDomainFederatedIdPs fetches and returns a list of federated identity providers enabled for the domain with
	// the given ID
	ListDomainFederatedIdPs(domainID *uuid.UUID) ([]models.FederatedIdpID, error)
	// PurgeByID permanently removes specified comments for the specified domain by its ID.
	//   - deleted indicates whether to remove comments marked as deleted
	//   - userDeleted indicates whether to remove comments created by now deleted users
	// Returns number of deleted comments
	PurgeByID(id *uuid.UUID, deleted, userDeleted bool) (int64, error)
	// SaveExtensions saves domain's extension links
	SaveExtensions(domainID *uuid.UUID, extensions []*data.DomainExtension) error
	// SaveIdPs saves domain's identity provider links
	SaveIdPs(domainID *uuid.UUID, idps []models.FederatedIdpID) error
	// SetReadonly sets the readonly status for the given domain
	SetReadonly(domainID *uuid.UUID, readonly bool) error
	// Update updates an existing domain record in the database
	Update(domain *data.Domain) error
	// UserAdd links the specified user to the given domain
	UserAdd(du *data.DomainUser) error
	// UserModify updates roles and settings of the specified user in the given domain
	UserModify(du *data.DomainUser) error
	// UserRemove unlinks the specified user from the given domain
	UserRemove(userID, domainID *uuid.UUID) error
}

//----------------------------------------------------------------------------------------------------------------------

// domainService is a blueprint DomainService implementation
type domainService struct{ dbTxAware }

func (svc *domainService) ClearByID(id *uuid.UUID) error {
	logger.Debugf("domainService.ClearByID(%s)", id)

	// Remove all domain's pages, which will also cause the removal of all comments, votes, and view stats
	if _, err := svc.dbx().Delete("cm_domain_pages").Where(goqu.Ex{"domain_id": id}).Executor().Exec(); err != nil {
		return translateDBErrors("domainService.ClearByID/Delete[page removal]", err)
	}

	// Zero the domain's counters
	if err := persistence.ExecOne(svc.dbx().Update("cm_domains").Set(goqu.Record{"count_comments": 0, "count_views": 0}).Where(goqu.Ex{"id": id})); err != nil {
		return translateDBErrors("domainService.ClearByID/Update[domain update]", err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) CountForUser(userID *uuid.UUID, owner, moderator bool) (int, error) {
	logger.Debugf("domainService.CountForUser(%s)", userID)

	// Prepare a query
	q := svc.dbx().From("cm_domains_users").Where(goqu.Ex{"user_id": userID})
	if moderator {
		q = q.Where(goqu.ExOr{"is_owner": true, "is_moderator": true})
	} else if owner {
		q = q.Where(goqu.Ex{"is_owner": true})
	}

	// Query the domain count
	cnt, err := q.Count()
	if err != nil {
		return 0, translateDBErrors("domainService.CountForUser/Count", err)
	}

	// Succeeded
	return int(cnt), nil
}

func (svc *domainService) Create(userID *uuid.UUID, domain *data.Domain) error {
	logger.Debugf("domainService.Create(%s, %#v)", userID, domain)

	// Insert a new domain record
	if err := persistence.ExecOne(svc.dbx().Insert("cm_domains").Rows(domain)); err != nil {
		return translateDBErrors("domainService.Create/Insert", err)
	}

	// Register the user as domain owner
	if err := svc.UserAdd(data.NewDomainUser(&domain.ID, userID, true, true, true)); err != nil {
		return err
	}

	// Succeeded
	return nil
}

func (svc *domainService) DeleteByID(id *uuid.UUID) error {
	logger.Debugf("domainService.DeleteByID(%s)", id)
	if err := persistence.ExecOne(svc.dbx().Delete("cm_domains").Where(goqu.Ex{"id": id})); err != nil {
		return translateDBErrors("domainService.DeleteByID/Delete", err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) FindByHost(host string) (*data.Domain, error) {
	logger.Debugf("domainService.FindByHost('%s')", host)

	// Query the domain
	d := data.Domain{}
	if b, err := svc.dbx().From("cm_domains").Where(goqu.Ex{"host": host}).ScanStruct(&d); err != nil {
		return nil, translateDBErrors("domainService.FindByHost/ScanStruct", err)
	} else if !b {
		return nil, ErrNotFound
	}

	// Succeeded
	return &d, nil
}

func (svc *domainService) FindByID(id *uuid.UUID) (*data.Domain, error) {
	logger.Debugf("domainService.FindByID(%s)", id)

	// Query the domain
	d := data.Domain{}
	if b, err := svc.dbx().From("cm_domains").Where(goqu.Ex{"id": id}).ScanStruct(&d); err != nil {
		return nil, translateDBErrors("domainService.FindByID/ScanStruct", err)
	} else if !b {
		return nil, ErrNotFound
	}

	// Succeeded
	return &d, nil
}

func (svc *domainService) FindDomainUserByHost(host string, userID *uuid.UUID, createIfMissing bool) (*data.Domain, *data.DomainUser, error) {
	logger.Debugf("domainService.FindDomainUserByHost('%s', %s, %v)", host, userID, createIfMissing)

	// Query domain and domain user
	return svc.fetchDomainUser(
		svc.dbx().From(goqu.T("cm_domains").As("d")).
			Select(
				// Domain fields
				"d.*",
				// Domain user fields
				goqu.I("du.domain_id").As("du_domain_id"),
				goqu.I("du.user_id").As("du_user_id"),
				goqu.I("du.is_owner").As("du_is_owner"),
				goqu.I("du.is_moderator").As("du_is_moderator"),
				goqu.I("du.is_commenter").As("du_is_commenter"),
				goqu.I("du.notify_replies").As("du_notify_replies"),
				goqu.I("du.notify_moderator").As("du_notify_moderator"),
				goqu.I("du.notify_comment_status").As("du_notify_comment_status"),
				goqu.I("du.ts_created").As("du_ts_created")).
			LeftJoin(
				goqu.T("cm_domains_users").As("du"),
				goqu.On(goqu.Ex{"du.domain_id": goqu.I("d.id"), "du.user_id": userID})).
			Where(goqu.Ex{"d.host": host}),
		userID,
		createIfMissing)
}

func (svc *domainService) FindDomainUserByID(domainID, userID *uuid.UUID, createIfMissing bool) (*data.Domain, *data.DomainUser, error) {
	logger.Debugf("domainService.FindDomainUserByID(%s, %s, %v)", domainID, userID, createIfMissing)

	// Query domain and domain user
	return svc.fetchDomainUser(
		svc.dbx().From(goqu.T("cm_domains").As("d")).
			Select(
				// Domain fields
				"d.*",
				// Domain user fields
				goqu.I("du.domain_id").As("du_domain_id"),
				goqu.I("du.user_id").As("du_user_id"),
				goqu.I("du.is_owner").As("du_is_owner"),
				goqu.I("du.is_moderator").As("du_is_moderator"),
				goqu.I("du.is_commenter").As("du_is_commenter"),
				goqu.I("du.notify_replies").As("du_notify_replies"),
				goqu.I("du.notify_moderator").As("du_notify_moderator"),
				goqu.I("du.notify_comment_status").As("du_notify_comment_status"),
				goqu.I("du.ts_created").As("du_ts_created")).
			LeftJoin(
				goqu.T("cm_domains_users").As("du"),
				goqu.On(goqu.Ex{"du.domain_id": goqu.I("d.id"), "du.user_id": userID})).
			Where(goqu.Ex{"d.id": domainID}),
		userID,
		createIfMissing)
}

func (svc *domainService) GenerateSSOSecret(domainID *uuid.UUID) (string, error) {
	logger.Debugf("domainService.GenerateSSOSecret(%s)", domainID)

	// Generate a new secret
	d := &data.Domain{ID: *domainID}
	if err := d.SSOSecretNew(); err != nil {
		logger.Errorf("userService.GenerateSSOSecret/SSOSecretNew: %v", err)
		return "", err
	}

	// Update the domain record
	if err := persistence.ExecOne(svc.dbx().Update("cm_domains").Set(goqu.Record{"sso_secret": d.SSOSecret}).Where(goqu.Ex{"id": &d.ID})); err != nil {
		return "", translateDBErrors("domainService.GenerateSSOSecret/Update", err)
	}

	// Succeeded
	return d.SSOSecret.String, nil
}

func (svc *domainService) IncrementCounts(domainID *uuid.UUID, incComments, incViews int) error {
	logger.Debugf("domainService.IncrementCounts(%s, %d, %d)", domainID, incComments, incViews)

	// Update the domain record
	err := persistence.ExecOne(
		svc.dbx().Update("cm_domains").
			Set(goqu.Record{
				"count_comments": goqu.L("? + ?", goqu.I("count_comments"), incComments),
				"count_views":    goqu.L("? + ?", goqu.I("count_views"), incViews),
			}).
			Where(goqu.Ex{"id": domainID}))
	if err != nil {
		return translateDBErrors("domainService.IncrementCounts/Update", err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) ListByDomainUser(userID, curUserID *uuid.UUID, superuser, withDomainUserOnly bool, filter, sortBy string, dir data.SortDirection, pageIndex int) ([]*data.Domain, []*data.DomainUser, error) {
	logger.Debugf("domainService.ListByDomainUser(%s, %s, %v, %v, '%s', '%s', %s, %d)", userID, curUserID, superuser, withDomainUserOnly, filter, sortBy, dir, pageIndex)

	// Prepare a statement
	q := svc.dbx().From(goqu.T("cm_domains").As("d")).
		Select(
			// Domain fields
			"d.*",
			// Domain user fields for userID
			goqu.I("du.domain_id").As("du_domain_id"),
			goqu.I("du.user_id").As("du_user_id"),
			goqu.I("du.is_owner").As("du_is_owner"),
			goqu.I("du.is_moderator").As("du_is_moderator"),
			goqu.I("du.is_commenter").As("du_is_commenter"),
			goqu.I("du.notify_replies").As("du_notify_replies"),
			goqu.I("du.notify_moderator").As("du_notify_moderator"),
			goqu.I("du.notify_comment_status").As("du_notify_comment_status"),
			goqu.I("du.ts_created").As("du_ts_created"),
			// Domain user fields for curUserID
			goqu.I("duc.is_owner").As("duc_is_owner"))

	// Join domain users for userID. Use an inner join if only domains with a domain user are requested
	duTable := goqu.T("cm_domains_users").As("du")
	duJoinOn := goqu.On(goqu.Ex{"du.domain_id": goqu.I("d.id"), "du.user_id": userID})
	if withDomainUserOnly {
		q = q.Join(duTable, duJoinOn)
	} else {
		q = q.LeftJoin(duTable, duJoinOn)
	}

	// Add filter by domain user for the current user
	ducTable := goqu.T("cm_domains_users").As("duc")
	ducJoinOn := goqu.On(goqu.Ex{"duc.domain_id": goqu.I("d.id"), "duc.user_id": curUserID})
	if superuser {
		// Superuser can see all domains, so a domain user is optional
		q = q.LeftJoin(ducTable, ducJoinOn)

	} else {
		// For regular users, only show domains that the current user is registered for
		q = q.Join(ducTable, ducJoinOn)
	}

	// Add substring filter
	if filter != "" {
		pattern := "%" + strings.ToLower(filter) + "%"
		q = q.Where(goqu.Or(
			goqu.L(`lower("d"."name")`).Like(pattern),
			goqu.L(`lower("d"."host")`).Like(pattern),
		))
	}

	// Configure sorting
	sortIdent := "d.host"
	switch sortBy {
	case "name":
		sortIdent = "d.name"
	case "created":
		sortIdent = "d.ts_created"
	case "countComments":
		sortIdent = "d.count_comments"
	case "countViews":
		sortIdent = "d.count_views"
	}
	q = q.Order(
		dir.ToOrderedExpression(sortIdent),
		goqu.I("d.id").Asc(), // Always add ID for stable ordering
	)

	// Paginate if required
	if pageIndex >= 0 {
		q = q.Limit(util.ResultPageSize).Offset(uint(pageIndex) * util.ResultPageSize)
	}

	// Query domains
	var dbRecs []struct {
		data.Domain
		data.NullDomainUser
		CurUserIsOwner sql.NullBool `db:"duc_is_owner"`
	}
	if err := q.ScanStructs(&dbRecs); err != nil {
		return nil, nil, translateDBErrors("domainService.ListByDomainUser/ScanStructs", err)
	}

	// Process the fetched domains
	var ds []*data.Domain
	var dus []*data.DomainUser
	for _, r := range dbRecs {
		// Accumulate domains, applying the current user's authorisations
		ds = append(ds, r.Domain.CloneWithClearance(superuser, r.CurUserIsOwner.Valid && r.CurUserIsOwner.Bool))

		// Accumulate domain users, if there's one
		if du := r.NullDomainUser.ToDomainUser(); du != nil {
			dus = append(dus, du)
		}
	}

	// Succeeded
	return ds, dus, nil
}

func (svc *domainService) ListDomainExtensions(domainID *uuid.UUID) ([]*data.DomainExtension, error) {
	logger.Debugf("domainService.ListDomainExtensions(%s)", domainID)

	// Query domain's extensions
	var dbRecs []struct {
		ID     models.DomainExtensionID `db:"extension_id"`
		Config string                   `db:"config"`
	}
	if err := svc.dbx().From("cm_domains_extensions").Where(goqu.Ex{"domain_id": domainID}).ScanStructs(&dbRecs); err != nil {
		return nil, translateDBErrors("domainService.ListDomainExtensions/ScanStructs", err)
	}

	// Filter extensions by only keeping those known and enabled globally
	var res []*data.DomainExtension
	for _, r := range dbRecs {
		if ext, ok := data.DomainExtensions[r.ID]; ok && ext.Enabled {
			res = append(res, &data.DomainExtension{
				ID:          r.ID,
				Name:        ext.Name,
				Config:      util.If(r.Config == "", ext.Config, r.Config), // Empty config means default config
				KeyRequired: ext.KeyRequired,
				KeyProvided: ext.KeyProvided,
				Enabled:     true,
			})
		}
	}

	// Sort the extensions by ID for a stable ordering
	sort.Slice(res, func(i, j int) bool { return res[i].ID < res[j].ID })

	// Succeeded
	return res, nil
}

func (svc *domainService) ListDomainFederatedIdPs(domainID *uuid.UUID) ([]models.FederatedIdpID, error) {
	logger.Debugf("domainService.ListDomainFederatedIdPs(%s)", domainID)

	// Query domain's IdPs
	var idps []models.FederatedIdpID
	if err := svc.dbx().From("cm_domains_idps").Select("fed_idp_id").Where(goqu.Ex{"domain_id": domainID}).ScanVals(&idps); err != nil {
		return nil, translateDBErrors("domainService.ListDomainFederatedIdPs/ScanVals", err)
	}

	// Filter providers by keeping only those enabled globally
	var res []models.FederatedIdpID
	for _, id := range idps {
		if _, ok, _, _ := config.GetFederatedIdP(id); ok {
			res = append(res, id)
		}
	}

	// Sort the providers by ID for a stable ordering
	sort.Slice(res, func(i, j int) bool { return res[i] < res[j] })

	// Succeeded
	return res, nil
}

func (svc *domainService) PurgeByID(id *uuid.UUID, deleted, userDeleted bool) (int64, error) {
	logger.Debugf("domainService.PurgeByID(%s, %v, %v)", id, deleted, userDeleted)

	// Sanity check
	if !deleted && !userDeleted {
		return 0, nil
	}

	// Prepare filter
	var filter []exp.Expression
	if deleted {
		filter = append(filter, goqu.I("is_deleted").IsTrue())
	}
	if userDeleted {
		filter = append(filter, goqu.I("user_created").IsNull())
	}

	// Delete all comments for the domain that are marked for deletion and/or created by now deleted users
	var cnt int64
	res, err := svc.dbx().Delete("cm_comments").
		Where(
			goqu.I("page_id").In(svc.dbx().From("cm_domain_pages").Select("id").Where(goqu.Ex{"domain_id": id})),
			goqu.Or(filter...)).
		Executor().
		Exec()
	if err != nil {
		return 0, translateDBErrors("domainService.PurgeByID/Exec", err)
	} else if cnt, err = res.RowsAffected(); err != nil {
		return 0, translateDBErrors("domainService.PurgeByID/RowsAffected", err)
	}

	// Succeeded
	return cnt, nil
}

func (svc *domainService) SaveExtensions(domainID *uuid.UUID, extensions []*data.DomainExtension) error {
	logger.Debugf("domainService.SaveExtensions(%v)", extensions)

	// Delete any existing links
	if _, err := svc.dbx().Delete("cm_domains_extensions").Where(goqu.Ex{"domain_id": domainID}).Executor().Exec(); err != nil {
		return translateDBErrors("domainService.SaveExtensions/Exec[delete]", err)
	}

	// Insert domain IdP records, if any
	if len(extensions) > 0 {
		// Prepare rows for inserting
		var dbRecs []data.DomainExtensionConfig
		for _, de := range extensions {
			dbRecs = append(dbRecs, data.DomainExtensionConfig{
				DomainID:    *domainID,
				ExtensionID: de.ID,
				Config:      util.If(de.HasDefaultConfig(), "", de.Config), // Empty config if it matches the default,
			})
		}

		// Execute the statement
		if _, err := svc.dbx().Insert("cm_domains_extensions").Rows(dbRecs).Executor().Exec(); err != nil {
			return translateDBErrors("domainService.SaveExtensions/Exec[insert]", err)
		}
	}

	// Succeeded
	return nil
}

func (svc *domainService) SaveIdPs(domainID *uuid.UUID, idps []models.FederatedIdpID) error {
	logger.Debugf("domainService.SaveIdPs(%v)", idps)

	// Delete any existing links
	if _, err := svc.dbx().Delete("cm_domains_idps").Where(goqu.Ex{"domain_id": domainID}).Executor().Exec(); err != nil {
		return translateDBErrors("domainService.SaveIdPs/Exec[delete]", err)
	}

	// Insert domain IdP records, if any
	if len(idps) > 0 {
		// Prepare rows for inserting
		var rows []goqu.Record
		for _, id := range idps {
			rows = append(rows, goqu.Record{"domain_id": domainID, "fed_idp_id": id})
		}

		// Execute the statement
		if _, err := svc.dbx().Insert("cm_domains_idps").Rows(rows).Executor().Exec(); err != nil {
			return translateDBErrors("domainService.SaveIdPs/Exec[insert]", err)
		}
	}

	// Succeeded
	return nil
}

func (svc *domainService) SetReadonly(domainID *uuid.UUID, readonly bool) error {
	logger.Debugf("domainService.SetReadonly(%s, %v)", domainID, readonly)

	// Update the domain record
	err := persistence.ExecOne(svc.dbx().Update("cm_domains").Set(goqu.Record{"is_readonly": readonly}).Where(goqu.Ex{"id": domainID}))
	if err != nil {
		return translateDBErrors("domainService.SetReadonly/Update", err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) Update(domain *data.Domain) error {
	logger.Debugf("domainService.Update(%#v)", domain)

	// Update the domain record
	if err := persistence.ExecOne(svc.dbx().Update("cm_domains").Set(domain).Where(goqu.Ex{"id": &domain.ID})); err != nil {
		return translateDBErrors("domainService.Update/Update", err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) UserAdd(du *data.DomainUser) error {
	logger.Debugf("domainService.UserAdd(%#v)", du)

	// Don't bother if the user is an anonymous one
	if du.UserID == data.AnonymousUser.ID {
		return nil
	}

	// Fire a new owner event, if necessary
	if err := svc.checkFireNewOwnerEvent(du); err != nil {
		return err
	}

	// Insert a new domain-user link record
	if err := persistence.ExecOne(svc.dbx().Insert("cm_domains_users").Rows(du)); err != nil {
		return translateDBErrors("domainService.UserAdd/Insert", err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) UserModify(du *data.DomainUser) error {
	logger.Debugf("domainService.UserModify(%#v)", du)

	// Don't bother if the user is an anonymous one
	if du.UserID == data.AnonymousUser.ID {
		return nil
	}

	// Fire a new owner event, if necessary
	if err := svc.checkFireNewOwnerEvent(du); err != nil {
		return err
	}

	// Update the domain-user link record
	err := persistence.ExecOne(svc.dbx().Update("cm_domains_users").Set(du).Where(goqu.Ex{"domain_id": &du.DomainID, "user_id": &du.UserID}))
	if err != nil {
		return translateDBErrors("domainService.UserModify/Update", err)
	}

	// Succeeded
	return nil
}

func (svc *domainService) UserRemove(userID, domainID *uuid.UUID) error {
	logger.Debugf("domainService.UserRemove(%s, %s)", userID, domainID)

	// Don't bother if the user is an anonymous one
	if *userID != data.AnonymousUser.ID {
		// Delete the domain-user link record
		err := persistence.ExecOne(svc.dbx().Delete("cm_domains_users").Where(goqu.Ex{"domain_id": domainID, "user_id": userID}))
		if err != nil {
			return translateDBErrors("domainService.UserRemove/Delete", err)
		}
	}

	// Succeeded
	return nil
}

// checkFireNewOwnerEvent fires a "user becomes owner" if necessary
func (svc *domainService) checkFireNewOwnerEvent(du *data.DomainUser) error {
	// Skip unless it's about an owner user and the plugin manager is active
	if !du.IsOwner || !Services.PluginManager().Active() {
		return nil
	}

	// Find out how many domains the user is already an owner of
	domainCnt, err := svc.CountForUser(&du.UserID, true, false)
	if err != nil {
		return err
	}

	// Lookup the user by ID
	u, err := Services.UserService(svc.tx).FindUserByID(&du.UserID)
	if err != nil {
		return err
	}

	// Fire an event
	if changed, err := handleUserEvent(&plugin.UserBecomesOwnerEvent{CountOwnedDomains: domainCnt}, u, svc.tx); err != nil {
		return err
	} else if changed {
		// The user was modified while handling the event: we need to save it
		return Services.UserService(svc.tx).Persist(u)
	}

	// Successfully handled and no change from event
	return nil
}

// fetchDomainUser retrieves a domain and a domain user from the provided dataset, creating a domain user if necessary
func (svc *domainService) fetchDomainUser(q *goqu.SelectDataset, userID *uuid.UUID, createIfMissing bool) (*data.Domain, *data.DomainUser, error) {
	var r struct {
		data.Domain
		data.NullDomainUser
	}
	if b, err := q.ScanStruct(&r); err != nil {
		return nil, nil, translateDBErrors("domainService.fetchDomainUser/ScanStruct", err)
	} else if !b {
		return nil, nil, ErrNotFound
	}

	// If no domain user found, and we need to create one
	du := r.NullDomainUser.ToDomainUser()
	if du == nil && createIfMissing {
		// Make the user a commenter, which is the default
		du = data.NewDomainUser(&r.Domain.ID, userID, false, false, true)
		if err := svc.UserAdd(du); err != nil {
			return nil, nil, err
		}
	}

	// Succeeded
	return &r.Domain, du, nil
}
