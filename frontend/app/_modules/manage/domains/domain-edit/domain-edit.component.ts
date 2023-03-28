import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import {
    ApiOwnerService,
    Domain,
    DomainState,
    EmailNotificationPolicy,
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

    readonly Paths = Paths;
    readonly loading = new ProcessingStatus();
    readonly saving  = new ProcessingStatus();
    readonly idps = this.cfgSvc.allIdps;
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
        idps:                    this.fb.array(this.idps.map(idp => idp.id !== 'sso')), // Enable all but SSO by default
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
                    this.domain = d;
                    this.form.setValue({
                        host:                    d.host,
                        displayName:             d.displayName || '',
                        state:                   d.state,
                        autoSpamFilter:          !!d.autoSpamFilter,
                        requireModeration:       !!d.requireModeration,
                        allowAnonymous:          !d.requireIdentification,
                        moderateAllAnonymous:    !!d.moderateAllAnonymous,
                        emailNotificationPolicy: d.emailNotificationPolicy,
                        ssoUrl:                  d.ssoUrl || '',
                        defaultSortPolicy:       d.defaultSortPolicy,
                        // Checkbox for a specific IdP is on if that IdP is present among the enabled ones for the domain
                        idps:                    this.idps.map(idp => !!d.idps?.includes(idp.id)),
                    });
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
            const dto: Domain = {
                // Host cannot be changed once set
                host:                    vals.host || this.domain!.host,
                displayName:             vals.displayName,
                state:                   vals.state!,
                autoSpamFilter:          vals.autoSpamFilter,
                requireModeration:       vals.requireModeration,
                requireIdentification:   !vals.allowAnonymous,
                moderateAllAnonymous:    vals.moderateAllAnonymous,
                defaultSortPolicy:       vals.defaultSortPolicy!,
                emailNotificationPolicy: vals.emailNotificationPolicy!,
                idps:                    this.idps.filter((_, idx) => vals.idps?.[idx]).map(idp => idp.id),
            };

            // Run creation/updating with the API
            (this.isNew ? this.api.domainNew({domain: dto}) : this.api.domainUpdate({domain: dto}))
                .pipe(this.saving.processing())
                .subscribe(() => {
                    // Add a success toast
                    this.toastSvc.success('data-saved').keepOnRouteChange();
                    // Navigate to the edited/created domain
                    return this.router.navigate([Paths.manage.domains, dto.host]);
                });
        }
    }
}
