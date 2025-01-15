import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { finalize, first, of, switchMap, throwError, timer } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ConfigService } from '../../../_services/config.service';
import { ApiGeneralService, Configuration, FederatedIdentityProvider } from '../../../../generated-api';
import { ToastService } from '../../../_services/toast.service';
import { AuthService } from '../../../_services/auth.service';
import { Paths } from '../../../_utils/consts';
import { SpinnerDirective } from '../../tools/_directives/spinner.directive';
import { IdentityProviderIconComponent } from '../../tools/identity-provider-icon/identity-provider-icon.component';

@UntilDestroy()
@Component({
    selector: 'app-federated-login',
    templateUrl: './federated-login.component.html',
    imports: [
        SpinnerDirective,
        IdentityProviderIconComponent,
        NgClass,
    ],
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

    loginWith(idp: string) {
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

                // If the authentication was successful, the token is now bound to the user. Use it for the token-based
                // login, skipping error handling
                switchMap(data => this.authSvc.loginViaToken(data.token!, true)),
                finalize(() => this.loggingIn = false))
            .subscribe({
                // The user is supposed to be authenticated now. Go to the previously stored URL, if any, or otherwise
                // to the Dashboard
                next: () => this.router.navigateByUrl(this.authSvc.afterLoginRedirectUrl || Paths.manage.dashboard),
                // Show a toast on a failed authentication
                error: error => this.toastSvc.error({messageId: 'oauth-login-failed', error}),
            });
    }

    getButtonClass(provider: FederatedIdentityProvider) {
        return provider.id.startsWith('oidc:') ? 'btn-dark' : `btn-${provider.id}`;
    }
}
