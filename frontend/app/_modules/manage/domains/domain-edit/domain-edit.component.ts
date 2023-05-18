import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import {
    ApiOwnerService,
    CommentSort,
    Domain,
    DomainModerationPolicy,
    DomainModNotifyPolicy,
    FederatedIdpId
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

    /** IDs of federated identity providers enabled for the domain being edited. */
    domainFedIdpIds?: FederatedIdpId[];

    readonly Paths = Paths;
    readonly loading = new ProcessingStatus();
    readonly saving  = new ProcessingStatus();
    readonly fedIdps = this.cfgSvc.clientConfig.federatedIdps;
    readonly form = this.fb.nonNullable.group({
        host:             '',
        name:             '',
        isReadonly:       false,
        authAnonymous:    false,
        authLocal:        true,
        authSso:          false,
        moderationPolicy: DomainModerationPolicy.Anonymous,
        modNotifyPolicy:  DomainModNotifyPolicy.Pending,
        ssoUrl:           '',
        defaultSort:      CommentSort.Td,
        fedIdps:          this.fb.array(Array(this.fedIdps.length).fill(true) as boolean[]), // Enable all by default
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

    get ctlHost(): AbstractControl<string> {
        return this.form.get('host')!;
    }

    get ctlName(): AbstractControl<string> {
        return this.form.get('name')!;
    }

    ngOnInit(): void {
        this.isNew = this.route.snapshot.data.new;

        // Fetch the domain, if any
        const host = this.route.snapshot.paramMap.get('host');
        if (host) {
            this.api.domainGet(host)
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
                        moderationPolicy: this.domain!.moderationPolicy,
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
                moderationPolicy: vals.moderationPolicy,
                modNotifyPolicy:  vals.modNotifyPolicy,
                ssoUrl:           vals.ssoUrl,
                defaultSort:      vals.defaultSort,
            };
            const federatedIdpIds = this.fedIdps.filter((_, idx) => vals.fedIdps?.[idx]).map(idp => idp.id);

            // Run creation/updating with the API
            (this.isNew ? this.api.domainNew({domain, federatedIdpIds}) : this.api.domainUpdate(this.domain!.id!, {domain, federatedIdpIds}))
                .pipe(this.saving.processing())
                .subscribe(newDomain => {
                    // Add a success toast
                    this.toastSvc.success('data-saved').keepOnRouteChange();
                    // Navigate to the edited/created domain
                    const commands = [Paths.manage.domains, newDomain.id];
                    if (!this.isNew) {
                        commands.push('settings');
                    }
                    return this.router.navigate(commands);
                });
        }
    }
}
