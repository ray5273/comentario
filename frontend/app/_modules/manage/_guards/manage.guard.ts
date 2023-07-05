import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject, Injectable } from "@angular/core";
import { first, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { DomainSelectorService } from "../_services/domain-selector.service";
import { Paths } from "../../../_utils/consts";

/**
 * Guard class for verifying access to managed objects.
 */
@Injectable()
export class ManageGuard {

    static readonly isDomainSelected: CanActivateFn = () => inject(ManageGuard).isDomainSelected();
    static readonly canManageDomain:  CanActivateFn = () => inject(ManageGuard).canManageDomain();
    static readonly isSuperOrOwner:   CanActivateFn = () => inject(ManageGuard).isSuperOrOwner();

    constructor(
        private readonly router: Router,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}

    /**
     * Check if there's a selected domain and return either true, or the domain manager route.
     */
    isDomainSelected(): Observable<boolean | UrlTree> {
        return this.domainSelectorSvc.domain.pipe(first(), map(d => d ? true : this.router.parseUrl(Paths.manage.domains)));
    }

    /**
     * Check if there's a selected domain and the current user is allowed to manage it, and return either true, or the
     * domain manager route.
     */
    canManageDomain(): Observable<boolean | UrlTree> {
        return this.domainSelectorSvc.domainUserIdps
            .pipe(
                first(),
                map(data => data.domain && (data.principal?.isSuperuser || data.domainUser?.isOwner) ?
                    true :
                    this.router.parseUrl(Paths.manage.domains)));
    }

    /**
     * Check if the current user is a superuser or there's a selected domain and the current user owns it, and return
     * either true, or the domain manager route.
     */
    isSuperOrOwner(): Observable<boolean | UrlTree> {
        return this.domainSelectorSvc.domainUserIdps
            .pipe(
                first(),
                map(data =>
                    data.principal?.isSuperuser ||
                    data.domainUser?.isOwner ||
                    this.router.parseUrl(Paths.manage.domains)));
    }
}
