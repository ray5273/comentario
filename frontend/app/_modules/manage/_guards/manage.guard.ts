import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject, Injectable } from '@angular/core';
import { first, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DomainSelectorService } from '../_services/domain-selector.service';
import { Paths } from '../../../_utils/consts';

/**
 * Guard class for verifying access to managed objects.
 */
@Injectable()
export class ManageGuard {

    static readonly selectDomain:       CanActivateFn = (route) => inject(ManageGuard).selectDomain(route);
    static readonly isDomainSelected:   CanActivateFn = () => inject(ManageGuard).isDomainSelected();
    static readonly canManageDomain:    CanActivateFn = () => inject(ManageGuard).canManageDomain();
    static readonly canManageDomainSso: CanActivateFn = () => inject(ManageGuard).canManageDomainSso();
    static readonly isSuper:            CanActivateFn = () => inject(ManageGuard).isSuper();

    constructor(
        private readonly router: Router,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}

    /**
     * Try to select the domain given in the ID route parameter and return either true, or the domain manager route.
     */
    selectDomain(route: ActivatedRouteSnapshot): false | Observable<boolean | UrlTree> {
        const id = route.paramMap.get('id');
        if (id) {
            return this.domainSelectorSvc.setDomainId(id)
                .pipe(map(ok => ok || this.router.parseUrl(Paths.manage.domains)));
        }
        return false;
    }

    /**
     * Check if there's a selected domain and return either true, or the domain manager route.
     */
    isDomainSelected(): Observable<boolean | UrlTree> {
        return this.domainSelectorSvc.domainMeta.pipe(
            first(),
            map(meta => meta.domain ? true : this.router.parseUrl(Paths.manage.domains)));
    }

    /**
     * Check if there's a selected domain and the current user is allowed to manage it, and return either true, or the
     * domain manager route.
     */
    canManageDomain(): Observable<boolean | UrlTree> {
        return this.domainSelectorSvc.domainMeta
            .pipe(
                first(),
                map(meta => meta.canManageDomain || this.router.parseUrl(Paths.manage.domains)));
    }

    /**
     * Check if there's a selected domain, it has SSO enabled, and the current user is allowed to manage it, and return
     * either true, or the domain properties/manager route.
     */
    canManageDomainSso(): Observable<boolean | UrlTree> {
        return this.domainSelectorSvc.domainMeta
            .pipe(
                first(),
                map(meta =>
                    meta.canManageDomain && meta.domain?.authSso ||
                    this.router.parseUrl(meta.domain ? `${Paths.manage.domains}/${meta.domain.id}` : Paths.manage.domains)));
    }

    /**
     * Check if the current user is a superuser, and return either true, or the domain manager route.
     */
    isSuper(): Observable<boolean | UrlTree> {
        return this.domainSelectorSvc.domainMeta
            .pipe(
                first(),
                map(meta => meta.principal?.isSuperuser || this.router.parseUrl(Paths.manage.domains)));
    }
}
