import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { faExternalLink } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { AuthService } from '../_services/auth.service';
import { DocsService } from '../_services/docs.service';
import { Paths } from '../_utils/consts';
import { Principal } from '../../generated-api';

@UntilDestroy()
@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {

    principal?: Principal | null;

    readonly Paths = Paths;
    readonly docGetStartedUrl = this.docsSvc.getPageUrl('getting-started/');

    // Icons
    readonly faExternalLink = faExternalLink;

    /** Handlers to execute when a specific parameter is present */
    private readonly paramHandlers: {[name: string]: (...args: any[]) => any} = {
        passwordResetToken: token => this.router.navigate([Paths.auth.resetPassword], {state: {token}}),
    };

    private paramsProcessed = false;

    constructor(
        private readonly changeDetector: ChangeDetectorRef,
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly docsSvc: DocsService,
        private readonly authSvc: AuthService,
    ) {}

    ngOnInit(): void {
        // Wait until the authentication status becomes known, and react on status change
        this.authSvc.principal
            .pipe(untilDestroyed(this))
            .subscribe(p => {
                this.principal = p;

                // Force change detection to run (influences the appearance of controls)
                this.changeDetector.detectChanges();

                // Handle any startup parameters, once
                if (!this.paramsProcessed) {
                    this.paramsProcessed = true;
                    this.processParams();
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
