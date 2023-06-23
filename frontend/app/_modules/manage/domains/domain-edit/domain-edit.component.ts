import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import {
    ApiGeneralService,
    CommentSort,
    Domain,
    DomainModNotifyPolicy,
    FederatedIdpId
} from '../../../../../generated-api';
import { Paths } from '../../../../_utils/consts';
import { ConfigService } from '../../../../_services/config.service';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ToastService } from '../../../../_services/toast.service';
import { Utils } from '../../../../_utils/utils';
import { DomainSelectorService } from '../../_services/domain-selector.service';

@Component({
    selector: 'app-domain-edit',
    templateUrl: './domain-edit.component.html',
})
export class DomainEditComponent implements OnInit {

    /** Whether the page is about creating a new instance (rather than editing an existing one). */
    isNew = true;

    /** Domain being edited. */
    domain?: Domain;

    /** IDs of federated identity providers enabled for the domain being edited. */
    domainFedIdpIds?: FederatedIdpId[];

    readonly Paths = Paths;
    readonly sorts = Object.values(CommentSort);
    readonly modNotifyPolicies = Object.values(DomainModNotifyPolicy);
    readonly loading = new ProcessingStatus();
    readonly saving  = new ProcessingStatus();
    readonly fedIdps = this.cfgSvc.config.federatedIdps;
    readonly form = this.fb.nonNullable.group({
        host:             '',
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
        fedIdps:          this.fb.array(Array(this.fedIdps.length).fill(true) as boolean[]), // Enable all by default
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
        this.ctlModNumCommentsOn  .valueChanges.subscribe(b => Utils.enableControls(b, this.ctlModNumComments));
        this.ctlModUserAgeDaysOn.valueChanges.subscribe(b => Utils.enableControls(b, this.ctlModUserAgeDays));
    }

    get ctlAuthSso(): AbstractControl<boolean> {
        return this.form.get('authSso')!;
    }

    get ctlHost(): AbstractControl<string> {
        return this.form.get('host')!;
    }

    get ctlModNumComments(): AbstractControl<number> {
        return this.form.get('modNumComments')!;
    }

    get ctlModNumCommentsOn(): AbstractControl<boolean> {
        return this.form.get('modNumCommentsOn')!;
    }

    get ctlModUserAgeDays(): AbstractControl<number> {
        return this.form.get('modUserAgeDays')!;
    }

    get ctlModUserAgeDaysOn(): AbstractControl<boolean> {
        return this.form.get('modUserAgeDaysOn')!;
    }

    get ctlName(): AbstractControl<string> {
        return this.form.get('name')!;
    }

    get ctlSsoUrl(): AbstractControl<string> {
        return this.form.get('ssoUrl')!;
    }

    ngOnInit(): void {
        this.isNew = this.route.snapshot.data.new;

        // Fetch the domain, if any
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.api.domainGet(id)
                .pipe(this.loading.processing())
                .subscribe(r => {
                    this.domain          = r.domain;
                    this.domainFedIdpIds = r.federatedIdpIds;
                    this.form.patchValue({
                        host:             this.domain!.host,
                        name:             this.domain!.name,
                        isReadonly:       this.domain!.isReadonly,
                        authAnonymous:    this.domain!.authAnonymous,
                        authLocal:        this.domain!.authLocal,
                        authSso:          this.domain!.authSso,
                        modAnonymous:     this.domain!.modAnonymous,
                        modAuthenticated: this.domain!.modAuthenticated,
                        modNumCommentsOn: !!this.domain!.modNumComments,
                        modNumComments:   this.domain!.modNumComments || 3,
                        modUserAgeDaysOn: !!this.domain!.modUserAgeDays,
                        modUserAgeDays:   this.domain!.modUserAgeDays || 7,
                        modImages:        this.domain!.modImages,
                        modLinks:         this.domain!.modLinks,
                        modNotifyPolicy:  this.domain!.modNotifyPolicy,
                        ssoUrl:           this.domain!.ssoUrl,
                        defaultSort:      this.domain!.defaultSort,
                        fedIdps:          this.fedIdps.map(idp => !!this.domainFedIdpIds?.includes(idp.id)),
                    });
                });
        }

        // Host can't be changed for an existing domain
        if (!this.isNew) {
            this.ctlHost.disable();
        }

        // SSO URL is only relevant when SSO auth is enabled
        this.ctlAuthSso.valueChanges.subscribe(b => Utils.enableControls(b, this.ctlSsoUrl));
    }

    submit() {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.form.valid) {
            const vals = this.form.value;
            const domain: Domain = {
                // Host cannot be changed once set
                host:             vals.host || this.domain!.host,
                name:             vals.name,
                isReadonly:       vals.isReadonly,
                authAnonymous:    vals.authAnonymous,
                authLocal:        vals.authLocal,
                authSso:          vals.authSso,
                modAnonymous:     vals.modAnonymous,
                modAuthenticated: vals.modAuthenticated,
                modNumComments:   vals.modNumCommentsOn ? vals.modNumComments : 0,
                modUserAgeDays:   vals.modUserAgeDaysOn ? vals.modUserAgeDays : 0,
                modImages:        vals.modImages,
                modLinks:         vals.modLinks,
                modNotifyPolicy:  vals.modNotifyPolicy,
                ssoUrl:           vals.ssoUrl ?? '',
                defaultSort:      vals.defaultSort,
            };
            const federatedIdpIds = this.fedIdps.filter((_, idx) => vals.fedIdps?.[idx]).map(idp => idp.id);

            // Run creation/updating with the API
            (this.isNew ? this.api.domainNew({domain, federatedIdpIds}) : this.api.domainUpdate(this.domain!.id!, {domain, federatedIdpIds}))
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
