package svc

import (
	"errors"
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/data"
	"time"
)

// ImportResult is the result of a comment import
type ImportResult struct {
	UsersTotal         int   // Total number of users
	UsersAdded         int   // Number of added users
	DomainUsersAdded   int   // Number of added domain users
	PagesTotal         int   // Total number of domain pages
	PagesAdded         int   // Number of added domain pages
	CommentsTotal      int   // Total number of comments processed
	CommentsImported   int   // Number of imported comments
	CommentsSkipped    int   // Number of skipped comments
	CommentsNonDeleted int   // Number of non-deleted imported comments
	Error              error // Any error occurred during the import
}

// ToDTO converts the result to an API model
func (ir *ImportResult) ToDTO() *models.ImportResult {
	dto := &models.ImportResult{
		CommentsImported:   uint64(ir.CommentsImported),
		CommentsNonDeleted: uint64(ir.CommentsNonDeleted),
		CommentsSkipped:    uint64(ir.CommentsSkipped),
		CommentsTotal:      uint64(ir.CommentsTotal),
		DomainUsersAdded:   uint64(ir.DomainUsersAdded),
		PagesAdded:         uint64(ir.PagesAdded),
		PagesTotal:         uint64(ir.PagesTotal),
		UsersAdded:         uint64(ir.UsersAdded),
		UsersTotal:         uint64(ir.UsersTotal),
	}
	if ir.Error != nil {
		dto.Error = ir.Error.Error()
	}
	return dto
}

// WithError sets the error in the result and returns the result
func (ir *ImportResult) WithError(err error) *ImportResult {
	ir.Error = err
	return ir
}

//----------------------------------------------------------------------------------------------------------------------

// ImportExportService is a service interface for dealing with data import/export
type ImportExportService interface {
	// Export exports the data for the specified domain, returning gzip-compressed binary data
	Export(domainID *uuid.UUID) ([]byte, error)
	// Import performs data import in the native Comentario (or legacy Commento v1/Comentario v2) format from the
	// provided data. Returns the number of imported comments: total and non-deleted
	Import(curUser *data.User, domain *data.Domain, buf []byte) *ImportResult
	// ImportDisqus performs data import in Disqus format from the provided data. Returns the number of imported
	// comments
	ImportDisqus(curUser *data.User, domain *data.Domain, buf []byte) *ImportResult
	// ImportWordPress performs data import in WordPress format from the provided data. Returns the number of imported
	// comments
	ImportWordPress(curUser *data.User, domain *data.Domain, buf []byte) *ImportResult
}

//----------------------------------------------------------------------------------------------------------------------

// importExportService is a blueprint ImportExportService implementation
type importExportService struct{ dbTxAware }

// importError returns an ImportResult containing only the specified error
func importError(err error) *ImportResult {
	return &ImportResult{Error: err}
}

func (svc *importExportService) Export(domainID *uuid.UUID) ([]byte, error) {
	logger.Debugf("importExportService.Export(%s)", domainID)
	return comentarioExport(domainID)
}

func (svc *importExportService) Import(curUser *data.User, domain *data.Domain, buf []byte) *ImportResult {
	logger.Debugf("importExportService.Import(%#v, %#v, [%d bytes])", curUser, domain, len(buf))
	return comentarioImport(curUser, domain, buf)
}

func (svc *importExportService) ImportDisqus(curUser *data.User, domain *data.Domain, buf []byte) *ImportResult {
	logger.Debugf("importExportService.ImportDisqus(%#v, %#v, [%d bytes])", curUser, domain, len(buf))
	return disqusImport(curUser, domain, buf)
}

func (svc *importExportService) ImportWordPress(curUser *data.User, domain *data.Domain, buf []byte) *ImportResult {
	logger.Debugf("importExportService.ImportWordPress(%#v, %#v, [%d bytes])", curUser, domain, len(buf))
	return wordpressImport(curUser, domain, buf)
}

// insertCommentsForParent inserts those comments from the map that have the specified parent ID, returning the number
// of successfully inserted and non-deleted comments
func insertCommentsForParent(parentID uuid.UUID, commentParentMap map[uuid.UUID][]*data.Comment, countsPerPage map[uuid.UUID]int) (countImported, countNonDeleted int, err error) {
	for _, c := range commentParentMap[parentID] {
		// Insert the comment
		if err = Services.CommentService(nil).Create(c); err != nil {
			return
		}
		countImported++
		if !c.IsDeleted {
			countNonDeleted++
			countsPerPage[c.PageID] = countsPerPage[c.PageID] + 1
		}

		// Insert any children of the comment
		var cci, ccnd int
		if cci, ccnd, err = insertCommentsForParent(c.ID, commentParentMap, countsPerPage); err != nil {
			return
		}
		countImported += cci
		countNonDeleted += ccnd
	}
	return
}

// importUserByEmail adds the specified user/domain user, returning the user and whether user and domain user were added
func importUserByEmail(email, federatedIdpID, name, websiteURL, remarks string, realEmail, federatedSSO bool, curUserID, domainID *uuid.UUID, creationTime time.Time) (*data.User, bool, bool, error) {
	// Try to find an existing user with the same email
	var user *data.User
	if u, err := Services.UserService(nil).FindUserByEmail(email); err == nil {
		// User already exists
		user = u

		// Check if domain user exists, too
		if _, du, err := Services.DomainService(nil).FindDomainUserByID(domainID, &u.ID, false); err != nil {
			return nil, false, false, err
		} else if du != nil {
			// Domain user already exists
			return user, false, false, nil
		}

	} else if !errors.Is(err, ErrNotFound) {
		// Any other error than "not found"
		return nil, false, false, err
	}

	// Persist a new user instance, if it doesn't exist
	var userAdded bool
	if user == nil {
		user = data.NewUser(email, name).
			WithCreated(creationTime, curUserID).
			WithWebsiteURL(websiteURL).
			WithRemarks(remarks).
			// If that's a real email, consider it confirmed (in the absence of a better alternative)
			WithConfirmed(realEmail)
		if federatedSSO || federatedIdpID != "" {
			user.WithFederated("", federatedIdpID)
		}
		if err := Services.UserService(nil).Create(user); err != nil {
			return nil, false, false, err
		}

		// If the email is real and Gravatar is enabled, enqueue a fetching operation
		if realEmail && Services.DynConfigService().GetBool(data.ConfigKeyIntegrationsUseGravatar) {
			Services.GravatarProcessor().Enqueue(&user.ID, user.Email)
		}
		userAdded = true
	}

	// Add a domain user as well
	if err := Services.DomainService(nil).UserAdd(data.NewDomainUser(domainID, &user.ID, false, false, true).WithCreated(creationTime)); err != nil {
		return user, userAdded, false, err
	}

	// Both user and domain user were added
	return user, userAdded, true, nil
}
