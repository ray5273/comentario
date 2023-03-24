import { inject, Injectable } from '@angular/core';
import {
    ActivatedRouteSnapshot, CanActivateFn,
    CanMatchFn,
    Route,
    Router,
    RouterStateSnapshot,
    UrlSegment,
    UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../_services/auth.service';
import { Paths } from '../_utils/consts';

export const authGuardCanLoad: CanMatchFn = (route: Route, segments: UrlSegment[]) =>
    inject(AuthGuard).canLoad(route, segments);

export const authGuardCanActivate: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) =>
    inject(AuthGuard).canActivate(route, state);

/**
 * Guard class that only allows activation and loading if there's an authenticated user.
 */
@Injectable({
    providedIn: 'root',
})
export class AuthGuard {

    constructor(
        private readonly router: Router,
        private readonly authSvc: AuthService,
    ) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
        return this.checkAuth(state.url);
    }

    canLoad(route: Route, segments: UrlSegment[]): Observable<boolean | UrlTree> {
        return this.checkAuth(segments.map(u => u.path).join('/'));
    }

    /**
     * Check whether the user is authenticated and return either true or the login route, wrapped in an observable.
     */
    private checkAuth(url: string): Observable<boolean | UrlTree> {
        // Only allow if the user is authenticated. Since component creation order is non-deterministic, the principal may not yet be
        // obtained by AuthService at this point, so we need to observe it
        return this.authSvc.lastPrincipal
            .pipe(
                map(p => {
                    // User authenticated
                    if (p) {
                        return true;
                    }

                    // Not authenticated: store the original URL and redirect to login
                    this.authSvc.afterLoginRedirectUrl = url;
                    return this.router.parseUrl(Paths.auth.login);
                }));
    }
}
