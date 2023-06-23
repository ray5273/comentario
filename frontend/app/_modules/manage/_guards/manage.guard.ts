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
}
