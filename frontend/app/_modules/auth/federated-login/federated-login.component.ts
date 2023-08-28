import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, first, of, switchMap, tap, throwError, timer } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ConfigService } from '../../../_services/config.service';
import { ApiGeneralService, Configuration, FederatedIdpId } from '../../../../generated-api';
import { ToastService } from '../../../_services/toast.service';
import { AuthService } from '../../../_services/auth.service';
import { Paths } from '../../../_utils/consts';
import { HttpContext } from '@angular/common/http';
import { HTTP_ERROR_HANDLING } from '../../../_services/http-interceptor.service';

@UntilDestroy()
@Component({
    selector: 'app-federated-login',
    templateUrl: './federated-login.component.html',
})
export class FederatedLoginComponent {

    loggingIn = false;

    readonly federatedIdps = this.cfgSvc.staticConfig.federatedIdps;

    constructor(
        private readonly router: Router,
        private readonly apiConfig: Configuration,
        private readonly api: ApiGeneralService,
        private readonly cfgSvc: ConfigService,
        private readonly toastSvc: ToastService,
        private readonly authSvc: AuthService,
    ) {}

    loginWith(idp: FederatedIdpId) {
        this.loggingIn = true;

        // Request a new, anonymous login token
        this.api.authLoginTokenNew()
            .pipe(
                // Open a login popup
                map(r => ({
                    popup: window.open(
                        `${this.apiConfig.basePath}/oauth/${idp}?token=${r.token}`,
                        '_blank',
                        'popup,width=800,height=600'),
                    token: r.token,
                })),

                // Check the popup was open
                switchMap(data => {
                    if (!data.popup) {
                        this.toastSvc.error('oauth-popup-failed');
                        return throwError(() => new Error('Failed to open OAuth popup'));
                    }
                    return of(data);
                }),

                // Monitor the popup closure
                switchMap(data => timer(500, 500)
                    .pipe(
                        // Stop on leaving the component
                        untilDestroyed(this),
                        // Give the user 2 minutes to complete the login (the timer ticks twice per second)
                        take(2 * 60 * 2),
                        // Pass the popup/token on
                        map(() => data))),

                // Repeat until closed
                first(data => !!data.popup?.closed),

                // If the authentication was successful, the token is supposed to be bound to the user now. Store it in
                // the API config to be used for the token-based login
                tap(data => this.apiConfig.credentials.token = data.token!),

                // Redeem the token, skipping error handling
                switchMap(() => this.api.authLoginTokenRedeem(
                        undefined,
                        undefined,
                        {context: new HttpContext().set(HTTP_ERROR_HANDLING, false)})
                    // Removing the token from the API config upon completion
                    .pipe(finalize(() => delete this.apiConfig.credentials.token))),
                finalize(() => this.loggingIn = false))
            .subscribe({
                // The user is supposed to be authenticated now
                next: p => {
                    this.authSvc.update(p);
                    this.router.navigateByUrl(this.authSvc.afterLoginRedirectUrl || Paths.manage.dashboard);
                },
                // Show a toast on a failed authentication
                error: err => this.toastSvc.error('oauth-login-failed', undefined, undefined, err),
            });
    }
}
