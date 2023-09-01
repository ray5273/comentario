import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { first, Observable, of, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
    ApiGeneralService,
    CommentSort,
    Domain,
    DomainExtension,
    DomainModNotifyPolicy,
} from '../../../../../generated-api';
import { Paths } from '../../../../_utils/consts';
import { ConfigService } from '../../../../_services/config.service';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ToastService } from '../../../../_services/toast.service';
import { Utils } from '../../../../_utils/utils';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';
import { XtraValidators } from '../../../../_utils/xtra-validators';

interface ExtensionValue {
    enabled: boolean;
    config:  string;
}

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

    /** The edit form. */
    form?: FormGroup;

    /** Enabled domain extensions. */
    extensions?: DomainExtension[];

    readonly Paths = Paths;
    readonly sorts = Object.values(CommentSort);
    readonly modNotifyPolicies = Object.values(DomainModNotifyPolicy);
    readonly loading = new ProcessingStatus();
    readonly saving  = new ProcessingStatus();
    readonly fedIdps = this.cfgSvc.staticConfig.federatedIdps;

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
    ) {}

    /**
     * Number of authentication methods enabled.
     */
    get numAuths(): number {
        const v = this.form?.value;
        return v ?
            (v.authAnonymous ? 1 : 0) +
            (v.authLocal     ? 1 : 0) +
            (v.authSso       ? 1 : 0) +
            (v.fedIdps?.filter((e: boolean) => e).length ?? 0) : 0;
    }

    /**
     * Number of enabled extensions.
     */
    get numExtensions(): number {
        const v = this.form?.value?.extensions;
        return v ?
            (Object.values(v) as ExtensionValue[]).filter(e => e.enabled).length :
            0;
    }

    ngOnInit(): void {
        this.isNew = this.route.snapshot.data.new;

        // Init the form
        this.initForm()
            .pipe(
                // If it isn't creating from scratch, fetch the domain data
                switchMap(() =>
                    this.route.snapshot.data.clean ?
                        of(undefined) :
                        this.domainSelectorSvc.domainMeta.pipe(this.loading.processing(), first())))
            .subscribe(meta => {
                this.domainMeta = meta;
                const d = this.domainMeta?.domain;
                if (d) {
                    this.form!.patchValue({
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

                    // Update enabled extension controls
                    this.extensions
                        // Collect {index, extension} pairs for each known extension
                        ?.map((cfgEx, idx) => ({idx, ex: this.domainMeta!.extensions?.find(e => e.id === cfgEx.id)}))
                        // Filter out disabled extensions
                        .filter(el => el.ex)
                        // Update the extension group
                        .forEach(el => {
                            const group = this.form!.get(`extensions.${el.idx}`) as FormGroup<{enabled: AbstractControl<boolean>; config: AbstractControl<string>}>;
                            group.controls.enabled.setValue(true);
                            group.controls.config.setValue(el.ex!.config ?? '');
                            group.controls.config.enable();
                        });
                }
            });
    }

    submit() {
        // Make sure the form has been initialised
        if (!this.form) {
            return;
        }

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

            // Collect IDs of enabled IdPs
            const federatedIdpIds = this.fedIdps?.filter((_, idx) => vals.fedIdps?.[idx]).map(idp => idp.id);

            // Collect {id, config} of enabled extensions
            const extensions = this.extensions ?
                this.extensions
                    .map((cfgEx, idx) => {
                        const vEx: ExtensionValue = vals.extensions[String(idx)];
                        return {id: cfgEx.id, enabled: vEx.enabled, config: vEx.config};
                    })
                    .filter(e => e.enabled)
                    .map(e => ({id: e.id, config: e.config})) :
                undefined;

            // Run creation/updating with the API
            (this.isNew ?
                    this.api.domainNew({domain, federatedIdpIds, extensions}) :
                    this.api.domainUpdate(this.domainMeta!.domain!.id!, {domain, federatedIdpIds, extensions}))
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

    private initForm(): Observable<void> {
        // Fetch known extensions
        return this.cfgSvc.extensions
            .pipe(
                first(),
                map(exts => {
                    // Save the extensions
                    this.extensions = exts;

                    // Create the form
                    const f = this.fb.nonNullable.group({
                        // Host can't be changed for an existing domain
                        host:             [{value: '', disabled: !this.isNew}, [XtraValidators.host]],
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
                        fedIdps:          this.fb.array(Array(this.fedIdps?.length).fill(true)), // Enable all by default
                        extensions:       this.getExtensionsFormGroup(),
                    });

                    // Disable numeric controls when the corresponding checkbox is off
                    f.controls.modNumCommentsOn.valueChanges
                        .pipe(untilDestroyed(this))
                        .subscribe(b => Utils.enableControls(b, f.controls.modNumComments));
                    f.controls.modUserAgeDaysOn.valueChanges
                        .pipe(untilDestroyed(this))
                        .subscribe(b => Utils.enableControls(b, f.controls.modUserAgeDays));

                    // SSO URL is only relevant when SSO auth is enabled
                    f.controls.authSso.valueChanges
                        .pipe(untilDestroyed(this))
                        .subscribe(b => Utils.enableControls(b, f.controls.ssoUrl));

                    // Extensions: disable the config control when the extension is disabled
                    this.extensions?.forEach((_, idx) =>
                        f.get(`extensions.${idx}.enabled`)!.valueChanges
                            .pipe(untilDestroyed(this))
                            .subscribe(b => Utils.enableControls(b, f.get(`extensions.${idx}.config`)!)));
                    this.form = f;
                }));
    }

    private getExtensionsFormGroup(): FormGroup {
        return this.fb.nonNullable.group(
            this.extensions?.reduce(
                (acc, ex, idx) => {
                    // Create a subgroup per extension, with its index as subgroup name
                    acc[String(idx)] = this.fb.nonNullable.group({
                        // Disabled by default
                        enabled: false,
                        // Config defaults to the extension default
                        config:  {value: ex.config, disabled: true},
                    });
                    return acc;
                },
                {} as any) ?? {});
    }
}
