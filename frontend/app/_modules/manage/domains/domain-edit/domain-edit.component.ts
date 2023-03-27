import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { $localize } from '@angular/localize/init';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import {
    ApiOwnerService,
    Domain,
    DomainState,
    EmailNotificationPolicy,
    IdentityProvider,
    SortPolicy,
} from '../../../../../generated-api';
import { Paths } from '../../../../_utils/consts';
import { ConfigService } from '../../../../_services/config.service';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ToastService } from '../../../../_services/toast.service';

@Component({
    selector: 'app-domain-edit',
    templateUrl: './domain-edit.component.html',
})
export class DomainEditComponent implements OnInit {

    /** Whether the page is about creating a new instance (rather than editing an existing one). */
    isNew = true;

    /** Domain being edited. */
    domain?: Domain;

    /** Configured identity providers. */
    idps: IdentityProvider[] = [
        {id: '',    name: $localize`Local (password-based)`},
        {id: 'sso', name: `Single Sign-On`},
        ...this.cfgSvc.clientConfig.idps,
    ];

    readonly Paths = Paths;
    readonly loading = new ProcessingStatus();
    readonly saving  = new ProcessingStatus();
    readonly form = this.fb.nonNullable.group({
        host:                    '',
        displayName:             '',
        state:                   DomainState.Unfrozen,
        autoSpamFilter:          false,
        requireModeration:       false,
        allowAnonymous:          false,
        moderateAllAnonymous:    false,
        emailNotificationPolicy: EmailNotificationPolicy.PendingModeration,
        ssoUrl:                  '',
        defaultSortPolicy:       SortPolicy.CreationdateAsc,
        idps:                    this.fb.array([]), // TODO
    });

    // Icons
    readonly faExclamationTriangle = faExclamationTriangle;

    constructor(
        private readonly fb: FormBuilder,
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly api: ApiOwnerService,
        private readonly cfgSvc: ConfigService,
        private readonly toastSvc: ToastService,
    ) {}

    get host(): AbstractControl<string> {
        return this.form.get('host')!;
    }

    get displayName(): AbstractControl<string> {
        return this.form.get('displayName')!;
    }

    ngOnInit(): void {
        this.isNew = this.route.snapshot.data.new;

        // Fetch the domain, if any
        const host = this.route.snapshot.paramMap.get('host');
        if (host) {
            this.api.domainGet(host)
                .pipe(this.loading.processing())
                .subscribe(d => {
                    this.form.patchValue({
                        host:                    d.host,
                        displayName:             d.displayName,
                        state:                   d.state,
                        autoSpamFilter:          d.autoSpamFilter,
                        requireModeration:       d.requireModeration,
                        allowAnonymous:          !d.requireIdentification,
                        moderateAllAnonymous:    d.moderateAllAnonymous,
                        emailNotificationPolicy: d.emailNotificationPolicy,
                        ssoUrl:                  d.ssoUrl,
                        defaultSortPolicy:       d.defaultSortPolicy,
                    });

                    // Update IdPs
                    // TODO
                });
        }

        // Host can't be changed for an existing domain
        if (!this.isNew) {
            this.host.disable();
        }
    }

    submit() {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.form.valid) {
            const vals = this.form.value;
            const dto = {
                host:                    vals.host!,
                displayName:             vals.displayName,
                state:                   vals.state!,
                autoSpamFilter:          vals.autoSpamFilter!,
                requireModeration:       vals.requireModeration!,
                requireIdentification:   !vals.allowAnonymous,
                moderateAllAnonymous:    vals.moderateAllAnonymous!,
                defaultSortPolicy:       vals.defaultSortPolicy!,
                emailNotificationPolicy: vals.emailNotificationPolicy!,
            };

            // Run update with the API
            this.api.domainUpdate({domain: dto})
                .pipe(this.saving.processing())
                .subscribe(() => {
                    // Add a success toast
                    this.toastSvc.success('data-saved').keepOnRouteChange();
                    // Navigate to the edited/created domain
                    return this.router.navigate([Paths.manage.domains, vals.host]);
                });
        }
    }
}
