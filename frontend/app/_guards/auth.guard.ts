import { inject, Injectable } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../_services/auth.service';
import { Paths } from '../_utils/consts';
import { Utils } from '../_utils/utils';
import { ToastService } from '../_services/toast.service';
import { PrincipalService } from '../_services/principal.service';

/**
 * Guard class that verifies various authentication and authorisation aspects.
 */
@Injectable({
    providedIn: 'root',
})
export class AuthGuard {

    static readonly hasTokenInNavigation:    CanActivateFn = () => inject(AuthGuard).hasTokenInNavigation();
    static readonly isAuthenticatedMatch:    CanMatchFn    = (route, segments) => inject(AuthGuard).isAuthenticated(segments.map(u => u.path).join('/'));
    static readonly isAuthenticatedActivate: CanActivateFn = (route, state) => inject(AuthGuard).isAuthenticated(state.url);
    static readonly isUnauthenticated:       CanActivateFn = () => inject(AuthGuard).isUnauthenticated();

    constructor(
        private readonly router: Router,
        private readonly authSvc: AuthService,
        private readonly principalSvc: PrincipalService,
        private readonly toastSvc: ToastService,
    ) {}

    /**
     * Redirect to home unless there's a token available in the current navigation state.
     */
    hasTokenInNavigation(): true | UrlTree {
        if (!Utils.isHexToken(this.router.getCurrentNavigation()?.extras?.state?.token)) {
            // Add a toast
            this.toastSvc.error({messageId: 'bad-token', keepOnRouteChange: true});
            // Redirect to home
            return this.router.parseUrl(Paths.home);
        }
        return true;
    }

    /**
     * Check whether the user is authenticated and return either true or the login route, wrapped in an observable.
     */
    isAuthenticated(url: string): Observable<boolean | UrlTree> {
        // Only allow if the user is authenticated
        return this.principalSvc.principal$
            .pipe(
                take(1),
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

    /**
     * Check whether the user is not authenticated and return either true or the dashboard route.
     */
    isUnauthenticated(): Observable<boolean | UrlTree> {
        return this.principalSvc.principal$
            .pipe(
                take(1),
                map(p => p ? this.router.parseUrl(Paths.manage.dashboard) : true));
    }
}
