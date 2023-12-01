package svc

import (
	"github.com/google/uuid"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/data"
	"io"
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

// TheImportExportService is a global ImportExportService implementation
var TheImportExportService ImportExportService = &importExportService{}

// ImportExportService is a service interface for dealing with data import/export
type ImportExportService interface {
	// Export exports the data for the specified domain, returning gzip-compressed binary data
	Export(domainID *uuid.UUID) ([]byte, error)
	// Import performs data import in the native Comentario (or legacy Commento v1/Comentario v2) format from the
	// provided data reader. Returns the number of imported comments: total and non-deleted
	Import(curUser *data.User, domain *data.Domain, reader io.Reader) *ImportResult
	// ImportDisqus performs data import from Disqus from the provided data reader. Returns the number of imported
	// comments
	ImportDisqus(curUser *data.User, domain *data.Domain, reader io.Reader) *ImportResult
}

//----------------------------------------------------------------------------------------------------------------------

// importExportService is a blueprint ImportExportService implementation
type importExportService struct{}

// importError returns an ImportResult containing only the specified error
func importError(err error) *ImportResult {
	return &ImportResult{Error: err}
}

func (svc *importExportService) Export(domainID *uuid.UUID) ([]byte, error) {
	logger.Debugf("importExportService.Export(%s)", domainID)
	return comentarioExport(domainID)
}

func (svc *importExportService) Import(curUser *data.User, domain *data.Domain, reader io.Reader) *ImportResult {
	logger.Debugf("importExportService.Import(%#v, %#v, ...)", curUser, domain)
	return comentarioImport(curUser, domain, reader)
}

func (svc *importExportService) ImportDisqus(curUser *data.User, domain *data.Domain, reader io.Reader) *ImportResult {
	logger.Debugf("importExportService.ImportDisqus(%#v, %#v, ...)", curUser, domain)
	return disqusImport(curUser, domain, reader)
}

// insertCommentsForParent inserts those comments from the map that have the specified parent ID, returning the number
// of successfully inserted and non-deleted comments
func insertCommentsForParent(parentID uuid.UUID, commentParentMap map[uuid.UUID][]*data.Comment, countsPerPage map[uuid.UUID]int) (countImported, countNonDeleted int, err error) {
	for _, c := range commentParentMap[parentID] {
		// Insert the comment
		if err = TheCommentService.Create(c); err != nil {
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
