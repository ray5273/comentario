import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Paths } from '../_utils/consts';
import { ToastService } from '../_services/toast.service';
import { Utils } from '../_utils/utils';

export const tokenGuardCanActivate: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) =>
    inject(TokenGuard).canActivate(route, state);

/**
 * Guard class that only enables activation when a token is presented in the current navigation.
 */
@Injectable({
    providedIn: 'root',
})
export class TokenGuard {

    constructor(
        private readonly router: Router,
        private readonly toastSvc: ToastService,
    ) {}

    /**
     * Redirect to home unless there's a token available in the current state.
     */
    canActivate(_: ActivatedRouteSnapshot, __: RouterStateSnapshot): true | UrlTree {
        if (!Utils.isHexToken(this.router.getCurrentNavigation()?.extras?.state?.token)) {
            // Add a toast
            this.toastSvc.error('bad-token').keepOnRouteChange();
            // Redirect to home
            return this.router.parseUrl(Paths.home);
        }
        return true;
    }
}
