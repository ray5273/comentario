import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../_services/auth.service';
import { Paths } from '../_utils/consts';

export const unauthGuardCanActivate: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) =>
    inject(UnauthGuard).canActivate(route, state);

/**
 * Guard class that acts opposite to AuthGuard, only enabling activation/loading for a non-authenticated user.
 */
@Injectable({
    providedIn: 'root',
})
export class UnauthGuard {

    constructor(
        private readonly router: Router,
        private readonly authSvc: AuthService,
    ) {}

    canActivate(_: ActivatedRouteSnapshot, __: RouterStateSnapshot): Observable<boolean | UrlTree> {
        return this.authSvc.lastPrincipal.pipe(map(p => p ? this.router.parseUrl(Paths.manage.dashboard) : true));
    }

}
