import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { AuthService } from '../_services/auth.service';
import { Paths } from '../_utils/consts';
import { ToastService } from '../_services/toast.service';
import { ConfigService } from '../_services/config.service';

@UntilDestroy()
@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {

    isAuthenticated = false;

    readonly Paths = Paths;
    readonly embedUrl = this.configSvc.staticConfig.homeContentUrl;

    /** Handlers to execute when a specific parameter is present */
    private readonly paramHandlers: {[name: string]: (...args: any[]) => any} = {
        passwordResetToken: token => {
            this.canRedirect = false;
            this.router.navigate([Paths.auth.resetPassword], {state: {token}});
        },
        unsubscribed: () => this.toastSvc.success('unsubscribed-ok'),
    };

    private paramsProcessed = false;
    private canRedirect = true;

    constructor(
        private readonly changeDetector: ChangeDetectorRef,
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly configSvc: ConfigService,
        private readonly authSvc: AuthService,
        private readonly toastSvc: ToastService,
    ) {}

    ngOnInit(): void {
        // Wait until the authentication status becomes known, and react on status change
        this.authSvc.principal
            .pipe(untilDestroyed(this))
            .subscribe(p => {
                this.isAuthenticated = !!p;

                // Force change detection to run (influences the appearance of controls)
                this.changeDetector.detectChanges();

                // Handle any startup parameters, once
                if (!this.paramsProcessed) {
                    this.paramsProcessed = true;
                    this.processParams();
                }

                // If no upcoming redirect and no embed either
                if (this.canRedirect && !this.embedUrl) {
                    // Redirect a logged in user to the dashboard, otherwise to the login
                    this.router.navigate([p ? Paths.manage.dashboard : Paths.auth.login]);
                }
            });
    }

    /**
     * Processes parameters passed to the component.
     */
    private processParams() {
        // Check if there's a specific parameter passed to the Home component
        const params = this.route.snapshot.queryParamMap;
        Object.entries(this.paramHandlers).find(([k, v]) => params.has(k) && (v(params.get(k)) || true /* Stop on first match */));
    }
}
