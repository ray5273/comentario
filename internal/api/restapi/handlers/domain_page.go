package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/exmodels"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/persistence"
	"gitlab.com/comentario/comentario/internal/svc"
	"gitlab.com/comentario/comentario/internal/util"
)

func DomainPageDelete(params api_general.DomainPageDeleteParams, user *data.User) middleware.Responder {
	// Fetch the page and the domain user
	page, _, domainUser, r := domainPageGetDomainUser(params.UUID, user)
	if r != nil {
		return r
	}

	// Make sure the user is at least a domain owner
	if r := Verifier.UserCanManageDomain(user, domainUser); r != nil {
		return r
	}

	// Delete the page
	if err := svc.Services.PageService(nil).Delete(&page.ID); err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDomainPageDeleteNoContent()
}

func DomainPageGet(params api_general.DomainPageGetParams, user *data.User) middleware.Responder {
	// Fetch the page and the domain user
	page, _, domainUser, r := domainPageGetDomainUser(params.UUID, user)
	if r != nil {
		return r
	}

	// Succeeded
	return api_general.NewDomainPageGetOK().
		WithPayload(&api_general.DomainPageGetOKBody{
			// Apply the current user's authorisations
			Page: page.CloneWithClearance(user.IsSuperuser, domainUser.IsAnOwner()).ToDTO(),
		})
}

func DomainPageList(params api_general.DomainPageListParams, user *data.User) middleware.Responder {
	// Extract domain ID
	domainID, r := parseUUID(params.Domain)
	if r != nil {
		return r
	}

	// Fetch pages the user has access to
	ps, err := svc.Services.PageService(nil).ListByDomainUser(
		&user.ID,
		domainID,
		user.IsSuperuser,
		swag.StringValue(params.Filter),
		swag.StringValue(params.SortBy),
		data.SortDirection(swag.BoolValue(params.SortDesc)),
		data.PageIndex(params.Page))
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDomainPageListOK().
		WithPayload(&api_general.DomainPageListOKBody{
			Pages: data.SliceToDTOs[*data.DomainPage, *models.DomainPage](ps),
		})
}

func DomainPageMoveData(params api_general.DomainPageMoveDataParams, user *data.User) middleware.Responder {
	// Fetch the source page and the domain user
	pgSrc, domSrc, du, r := domainPageGetDomainUser(params.UUID, user)
	if r != nil {
		return r
	}

	// Make sure the user is at least a domain owner
	if r := Verifier.UserCanManageDomain(user, du); r != nil {
		return r
	}

	// Fetch the target page and the domain user
	pgTgt, domTgt, _, r := domainPageGetDomainUser(params.Body.TargetPageID, user)
	if r != nil {
		return r
	}

	// Make sure target != source
	if pgTgt.ID == pgSrc.ID {
		return respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails("target page is the same as the source"))
	}

	// Make sure the pages are on the same domain
	if domSrc.ID != domTgt.ID {
		return respBadRequest(exmodels.ErrorInvalidPropertyValue.WithDetails("target page is on a different domain"))
	}

	// Move the page data
	err := svc.Services.WithTx(func(tx *persistence.DatabaseTx) error {
		ps := svc.Services.PageService(tx)
		return util.RunCheckErr([]util.ErrFunc{
			// Move comments
			func() error { return svc.Services.CommentService(tx).MoveToPage(&pgSrc.ID, &pgTgt.ID) },
			// Move page views
			func() error { return svc.Services.StatsService(tx).MovePageViews(&pgSrc.ID, &pgTgt.ID) },
			// Update target page metrics
			func() error { return ps.IncrementCounts(&pgTgt.ID, int(pgSrc.CountComments), int(pgSrc.CountViews)) },
			// Remove the source page
			func() error { return ps.Delete(&pgSrc.ID) },
		})
	})
	if err != nil {
		return respServiceError(err)
	}

	// Succeeded
	return api_general.NewDomainPageMoveDataNoContent()
}

func DomainPageUpdate(params api_general.DomainPageUpdateParams, user *data.User) middleware.Responder {
	// Fetch the page and the domain user
	page, domain, domainUser, r := domainPageGetDomainUser(params.UUID, user)
	if r != nil {
		return r
	}

	// Make sure the user is allowed to moderate page
	if r := Verifier.UserCanModerateDomain(user, domainUser); r != nil {
		return r
	}

	// If the path is changing
	path := string(params.Body.Path)
	if page.Path != path {
		// Verify the user can manage the domain
		if r := Verifier.UserCanManageDomain(user, domainUser); r != nil {
			return r
		}
		// Verify the path is not used by another page yet
		if r := Verifier.DomainPageCanUpdatePathTo(page, path); r != nil {
			return r
		}
	}

	// If the title is changing
	oldTitle := page.Title
	page.WithTitle(params.Body.Title) // Takes care of title truncation
	if page.Title != oldTitle {
		// Verify the user can manage the domain
		if r := Verifier.UserCanManageDomain(user, domainUser); r != nil {
			return r
		}
	}

	// Update the page
	if r := domainPageUpdateFetchTitle(domain, page.WithIsReadonly(swag.BoolValue(params.Body.IsReadonly)).WithPath(path)); r != nil {
		return r
	}

	// Succeeded
	return api_general.NewDomainPageUpdateNoContent()
}

func DomainPageUpdateTitle(params api_general.DomainPageUpdateTitleParams, user *data.User) middleware.Responder {
	// Fetch the page and the domain user
	page, domain, domainUser, r := domainPageGetDomainUser(params.UUID, user)
	if r != nil {
		return r
	}

	// Make sure the user is allowed to update page
	if r := Verifier.UserCanManageDomain(user, domainUser); r != nil {
		return r
	}

	// Update the page title
	if changed, err := svc.Services.PageService(nil).FetchUpdatePageTitle(domain, page); err != nil {
		return respServiceError(err)

	} else {
		// Succeeded
		return api_general.NewDomainPageUpdateTitleOK().
			WithPayload(&api_general.DomainPageUpdateTitleOKBody{Changed: changed})
	}
}

// domainPageGetDomainUser parses a string UUID and fetches the corresponding page, domain, and domain user, verifying
// the domain user exists
func domainPageGetDomainUser(pageID strfmt.UUID, user *data.User) (*data.DomainPage, *data.Domain, *data.DomainUser, middleware.Responder) {
	// Extract domain page ID
	pageUUID, r := parseUUID(pageID)
	if r != nil {
		return nil, nil, nil, r
	}

	// Fetch page
	page, err := svc.Services.PageService(nil).FindByID(pageUUID)
	if err != nil {
		return nil, nil, nil, respServiceError(err)
	}

	// Find the page's domain and user
	domain, domainUser, err := svc.Services.DomainService(nil).FindDomainUserByID(&page.DomainID, &user.ID, false)
	if err != nil {
		return nil, nil, nil, respServiceError(err)
	}

	// If no user record is present, the user isn't allowed to view the page at all (unless it's a superuser): respond
	// with Not Found as if the page doesn't exist
	if !user.IsSuperuser && domainUser == nil {
		return nil, nil, nil, respNotFound(nil)
	}

	// Succeeded
	return page, domain, domainUser, nil
}

// domainPageUpdateFetchTitle updates the page data and initiates a title fetch-and-update in the background if the
// page has no title set
func domainPageUpdateFetchTitle(domain *data.Domain, page *data.DomainPage) middleware.Responder {
	// Update the page record
	if err := svc.Services.PageService(nil).Update(page); err != nil {
		return respServiceError(err)
	}

	// If no title was provided, fetch it in the background, ignoring possible errors
	if page.Title == "" {
		svc.Services.PageTitleFetcher().Enqueue(domain, page)
	}

	// Succeeded
	return nil
}
