package handlers

import (
	"github.com/go-openapi/runtime/middleware"
	"github.com/go-openapi/strfmt"
	"github.com/go-openapi/swag"
	"gitlab.com/comentario/comentario/internal/api/models"
	"gitlab.com/comentario/comentario/internal/api/restapi/operations/api_general"
	"gitlab.com/comentario/comentario/internal/data"
	"gitlab.com/comentario/comentario/internal/svc"
)

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

func DomainPageUpdate(params api_general.DomainPageUpdateParams, user *data.User) middleware.Responder {
	// Fetch the page and the domain user
	page, _, domainUser, r := domainPageGetDomainUser(params.UUID, user)
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

	// Update the page
	ro := swag.BoolValue(params.Body.IsReadonly)
	if err := svc.Services.PageService(nil).Update(page.WithIsReadonly(ro).WithPath(path)); err != nil {
		return respServiceError(err)
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
	if r := Verifier.UserCanModerateDomain(user, domainUser); r != nil {
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
