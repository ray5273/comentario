import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiGeneralService, CommentSort, Domain, DomainModNotifyPolicy } from '../../../../../generated-api';
import { Paths } from '../../../../_utils/consts';
import { ConfigService } from '../../../../_services/config.service';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ToastService } from '../../../../_services/toast.service';
import { Utils } from '../../../../_utils/utils';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';
import { XtraValidators } from '../../../../_utils/xtra-validators';

@UntilDestroy()
@Component({
    selector: 'app-domain-edit',
    templateUrl: './domain-edit.component.html',
})
export class DomainEditComponent implements OnInit {

    /** Whether the page is about creating a new instance (rather than editing an existing one). */
    isNew = true;

    /** Domain/user metadata. */
    domainMeta?: DomainMeta;

    readonly Paths = Paths;
    readonly sorts = Object.values(CommentSort);
    readonly modNotifyPolicies = Object.values(DomainModNotifyPolicy);
    readonly loading = new ProcessingStatus();
    readonly saving  = new ProcessingStatus();
    readonly fedIdps = this.cfgSvc.staticConfig.federatedIdps;
    readonly form = this.fb.nonNullable.group({
        host:             ['', [XtraValidators.host]],
        name:             '',
        isReadonly:       false,
        authAnonymous:    false,
        authLocal:        true,
        authSso:          false,
        modAnonymous:     true,
        modAuthenticated: false,
        modNumCommentsOn: false,
        modNumComments:   [{value: 3, disabled: true}, [Validators.min(1), Validators.max(999)]],
        modUserAgeDaysOn: false,
        modUserAgeDays:   [{value: 7, disabled: true}, [Validators.min(1), Validators.max(999)]],
        modImages:        true,
        modLinks:         true,
        modNotifyPolicy:  DomainModNotifyPolicy.Pending,
        ssoUrl:           ['', [Validators.pattern(/^https:\/\/.+/)]], // We only expect HTTPS URLs here
        defaultSort:      CommentSort.Td,
        fedIdps:          this.fb.array(Array(this.fedIdps?.length).fill(true) as boolean[]), // Enable all by default
    });

    // Icons
    readonly faExclamationTriangle = faExclamationTriangle;
    constructor(
        private readonly fb: FormBuilder,
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly api: ApiGeneralService,
        private readonly cfgSvc: ConfigService,
        private readonly toastSvc: ToastService,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {
        // Disable numeric controls when the corresponding checkbox is off
        this.form.controls.modNumCommentsOn.valueChanges.pipe(untilDestroyed(this)).subscribe(b => Utils.enableControls(b, this.form.controls.modNumComments));
        this.form.controls.modUserAgeDaysOn.valueChanges.pipe(untilDestroyed(this)).subscribe(b => Utils.enableControls(b, this.form.controls.modUserAgeDays));
    }

    /**
     * Whether there's at least one authentication method enabled.
     */
    get authEnabled(): boolean {
        const v = this.form.value;
        return v.authAnonymous || v.authLocal || v.authSso || !!v.fedIdps?.includes(true);
    }

    ngOnInit(): void {
        this.isNew = this.route.snapshot.data.new;

        // If it isn't creating from scratch, fetch the domain data
        if (!this.route.snapshot.data.clean) {
        this.domainSelectorSvc.domainMeta
            .pipe(this.loading.processing(), first())
            .subscribe(meta => {
                this.domainMeta = meta;
                const d = this.domainMeta?.domain;
                if (d) {
                    this.form.patchValue({
                        host:             d.host,
                        name:             d.name,
                        isReadonly:       d.isReadonly,
                        authAnonymous:    d.authAnonymous,
                        authLocal:        d.authLocal,
                        authSso:          d.authSso,
                        modAnonymous:     d.modAnonymous,
                        modAuthenticated: d.modAuthenticated,
                        modNumCommentsOn: !!d.modNumComments,
                        modNumComments:   d.modNumComments || 3,
                        modUserAgeDaysOn: !!d.modUserAgeDays,
                        modUserAgeDays:   d.modUserAgeDays || 7,
                        modImages:        d.modImages,
                        modLinks:         d.modLinks,
                        modNotifyPolicy:  d.modNotifyPolicy,
                        ssoUrl:           d.ssoUrl,
                        defaultSort:      d.defaultSort,
                        fedIdps:          this.fedIdps?.map(idp => !!this.domainMeta!.federatedIdpIds?.includes(idp.id)),
                    });
                }
            });
        }

        // Host can't be changed for an existing domain
        if (!this.isNew) {
            this.form.controls.host.disable();
        }

        // SSO URL is only relevant when SSO auth is enabled
        this.form.controls.authSso.valueChanges.pipe(untilDestroyed(this)).subscribe(b => Utils.enableControls(b, this.form.controls.ssoUrl));
    }

    submit() {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.form.valid) {
            const vals = this.form.value;
            const domain: Domain = {
                // Host cannot be changed once set
                host:             vals.host || this.domainMeta!.domain!.host,
                name:             vals.name,
                isReadonly:       vals.isReadonly,
                authAnonymous:    !!vals.authAnonymous,
                authLocal:        !!vals.authLocal,
                authSso:          !!vals.authSso,
                modAnonymous:     !!vals.modAnonymous,
                modAuthenticated: !!vals.modAuthenticated,
                modNumComments:   vals.modNumCommentsOn ? (vals.modNumComments ?? 0) : 0,
                modUserAgeDays:   vals.modUserAgeDaysOn ? (vals.modUserAgeDays ?? 0) : 0,
                modImages:        !!vals.modImages,
                modLinks:         !!vals.modLinks,
                modNotifyPolicy:  vals.modNotifyPolicy ?? DomainModNotifyPolicy.Pending,
                ssoUrl:           vals.ssoUrl ?? '',
                defaultSort:      vals.defaultSort ?? CommentSort.Td,
            };
            const federatedIdpIds = this.fedIdps?.filter((_, idx) => vals.fedIdps?.[idx]).map(idp => idp.id);

            // Run creation/updating with the API
            (this.isNew ?
                    this.api.domainNew({domain, federatedIdpIds}) :
                    this.api.domainUpdate(this.domainMeta!.domain!.id!, {domain, federatedIdpIds}))
                .pipe(this.saving.processing())
                .subscribe(newDomain => {
                    // Add a success toast
                    this.toastSvc.success('data-saved').keepOnRouteChange();
                    // Reload the current domain
                    this.domainSelectorSvc.reload();
                    // Navigate to the edited/created domain
                    return this.router.navigate([Paths.manage.domains, newDomain.id]);
                });
        }
    }
}
