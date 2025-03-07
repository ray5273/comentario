import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { first, Observable, of, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
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
import { DynamicConfig } from '../../../../_models/config';
import { DomainEditExtensionsComponent } from './domain-edit-extensions/domain-edit-extensions.component';
import { SpinnerDirective } from '../../../tools/_directives/spinner.directive';
import { DomainEditGeneralComponent } from './domain-edit-general/domain-edit-general.component';
import { DomainEditAuthComponent } from './domain-edit-auth/domain-edit-auth.component';
import { DomainEditModerationComponent } from './domain-edit-moderation/domain-edit-moderation.component';
import { ValidatableDirective } from '../../../tools/_directives/validatable.directive';
import { DomainEventService } from '../../_services/domain-event.service';

interface ExtensionValue {
    enabled: boolean;
    config:  string;
}

@UntilDestroy()
@Component({
    selector: 'app-domain-edit',
    templateUrl: './domain-edit.component.html',
    imports: [
        ReactiveFormsModule,
        DomainEditExtensionsComponent,
        NgbNavModule,
        SpinnerDirective,
        DomainEditGeneralComponent,
        FaIconComponent,
        DomainEditAuthComponent,
        DomainEditModerationComponent,
        RouterLink,
        ValidatableDirective,
    ],
})
export class DomainEditComponent implements OnInit {

    /** Whether the page is about creating a new instance (rather than editing an existing one). */
    isNew = true;

    /** Domain/user metadata. */
    domainMeta?: DomainMeta;

    /** The edit form. */
    form?: FormGroup;

    /** Domain config being edited. */
    config?: DynamicConfig;

    /** Enabled domain extensions. */
    extensions?: DomainExtension[];

    readonly Paths = Paths;
    readonly loading = new ProcessingStatus();
    readonly saving  = new ProcessingStatus();

    /** Federated IdPs configured on the current instance. */
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
        private readonly domainEventSvc: DomainEventService,
    ) {}

    /**
     * Number of authentication methods enabled.
     */
    get numAuths(): number {
        const v = this.ctlGroupAuth?.value;
        return v ?
            (v.anonymous ? 1 : 0) +
            (v.local     ? 1 : 0) +
            (v.sso       ? 1 : 0) +
            (v.fedIdps?.filter((e: boolean) => e).length ?? 0) :
            0;
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

    get ctlGroupConfig(): FormGroup {
        return this.form!.controls.config as FormGroup;
    }

    get ctlGroupGeneral(): FormGroup {
        return this.form!.controls.general as FormGroup;
    }

    get ctlGroupAuth(): FormGroup {
        return this.form!.controls.auth as FormGroup;
    }

    get ctlGroupMod(): FormGroup {
        return this.form!.controls.mod as FormGroup;
    }

    get ctlGroupExtensions(): FormGroup {
        return this.form!.controls.extensions as FormGroup;
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
                        this.domainSelectorSvc.domainMeta(true).pipe(this.loading.processing(), first())),
                // Process domain metadata
                switchMap(meta => {
                    this.domainMeta = meta;
                    const d = this.domainMeta?.domain;
                    if (d) {
                        this.form!.patchValue({
                            general: {
                                isHttps:     d.isHttps,
                                host:        d.host,
                                name:        d.name,
                                defaultSort: d.defaultSort,
                            },
                            auth: {
                                anonymous: d.authAnonymous,
                                local:     d.authLocal,
                                sso:       d.authSso,
                                ssoUrl:    d.ssoUrl,
                                ssoNonInt: d.ssoNonInteractive,
                                fedIdps:   this.fedIdps?.map(idp => !!this.domainMeta!.federatedIdpIds?.includes(idp.id)),
                            },
                            mod: {
                                anonymous:     d.modAnonymous,
                                authenticated: d.modAuthenticated,
                                numCommentsOn: !!d.modNumComments,
                                numComments:   d.modNumComments || 3,
                                userAgeDaysOn: !!d.modUserAgeDays,
                                userAgeDays:   d.modUserAgeDays || 7,
                                images:        d.modImages,
                                links:         d.modLinks,
                                notifyPolicy:  d.modNotifyPolicy,
                            }
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

                    // Return either a cloned domain config if there's a domain, or the vanilla domain defaults as config
                    return this.domainMeta?.config ?
                        of(this.domainMeta.config.clone()) :
                        this.cfgSvc.dynamicConfig.pipe(untilDestroyed(this), first(), map(dc => dc.toDomainDefaults()));
                }))
            // Domain config arrived: create form subgroups for it
            .subscribe(cfg => {
                this.config = cfg;
                this.setupFormConfigGroups();
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
                // General
                isHttps:           !!vals.general.isHttps,
                host:              vals.general.host || this.domainMeta!.domain!.host,
                name:              vals.general.name,
                defaultSort:       vals.general.defaultSort ?? CommentSort.Td,
                // Auth
                authAnonymous:     !!vals.auth.anonymous,
                authLocal:         !!vals.auth.local,
                authSso:           !!vals.auth.sso,
                ssoUrl:            vals.auth.ssoUrl ?? '',
                ssoNonInteractive: !!vals.auth.ssoNonInt,
                // Moderation
                modAnonymous:      !!vals.mod.anonymous,
                modAuthenticated:  !!vals.mod.authenticated,
                modNumComments:    vals.mod.numCommentsOn ? (vals.mod.numComments ?? 0) : 0,
                modUserAgeDays:    vals.mod.userAgeDaysOn ? (vals.mod.userAgeDays ?? 0) : 0,
                modImages:         !!vals.mod.images,
                modLinks:          !!vals.mod.links,
                modNotifyPolicy:   vals.mod.notifyPolicy ?? DomainModNotifyPolicy.Pending,
            };

            // Prepare config, keeping only key and value from each item (other fields are readonly and shouldn't be
            // included)
            const configuration = this.config?.items.map(i => ({key: i.key, value: i.value}));

            // Collect IDs of enabled IdPs
            const federatedIdpIds = this.fedIdps?.filter((_, idx) => vals.auth.fedIdps?.[idx]).map(idp => idp.id);

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
                    this.api.domainNew({domain, configuration, federatedIdpIds, extensions}) :
                    this.api.domainUpdate(this.domainMeta!.domain!.id!, {domain, configuration, federatedIdpIds, extensions}))
                .pipe(this.saving.processing())
                .subscribe(newDomain => {
                    // Add a success toast
                    this.toastSvc.success({messageId: 'data-saved', keepOnRouteChange: true});
                    // Reload the current domain
                    this.domainSelectorSvc.reload();
                    // Emit a domain event
                    this.domainEventSvc.events.next({kind: this.isNew ? 'create' : 'update', domain});
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
                        general: this.fb.nonNullable.group({
                            isHttps:     true,
                            host:        [
                                {value: '', disabled: !this.isNew}, // Host can't be changed for an existing domain
                                [Validators.required, Validators.minLength(1), Validators.maxLength(259), XtraValidators.host],
                            ],
                            name:        ['', [Validators.maxLength(255)]],
                            defaultSort: CommentSort.Td,
                        }),
                        auth: this.fb.nonNullable.group({
                            anonymous: false,
                            local:     true,
                            sso:       false,
                            ssoUrl:    [
                                {value: '', disabled: true},
                                // Only allow insecure URL if the app itself runs on an HTTP host
                                [Validators.required, XtraValidators.url(window.location.protocol === 'https:')],
                            ],
                            ssoNonInt: false,
                            fedIdps:   this.fb.array(Array(this.fedIdps?.length).fill(true)), // Enable all by default
                        }),
                        mod: this.fb.nonNullable.group({
                            anonymous:     true,
                            authenticated: false,
                            numCommentsOn: false,
                            numComments:   [{value: 3, disabled: true}, [Validators.required, Validators.min(1), Validators.max(999)]],
                            userAgeDaysOn: false,
                            userAgeDays:   [{value: 7, disabled: true}, [Validators.required, Validators.min(1), Validators.max(999)]],
                            images:        true,
                            links:         true,
                            notifyPolicy:  DomainModNotifyPolicy.Pending,
                        }),
                        extensions: this.getExtensionsFormGroup(),
                        config: this.fb.nonNullable.group({}),
                    });

                    // SSO URL is only relevant when SSO auth is enabled
                    f.controls.auth.controls.sso.valueChanges
                        .pipe(untilDestroyed(this))
                        .subscribe(b => Utils.enableControls(b, f.controls.auth.controls.ssoUrl, f.controls.auth.controls.ssoNonInt));

                    // Disable numeric controls when the corresponding checkbox is off
                    f.controls.mod.controls.numCommentsOn.valueChanges
                        .pipe(untilDestroyed(this))
                        .subscribe(b => Utils.enableControls(b, f.controls.mod.controls.numComments));
                    f.controls.mod.controls.userAgeDaysOn.valueChanges
                        .pipe(untilDestroyed(this))
                        .subscribe(b => Utils.enableControls(b, f.controls.mod.controls.userAgeDays));

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
                        config:  [{value: ex.config, disabled: true}, [Validators.maxLength(4096)]],
                    });
                    return acc;
                },
                {} as any) ?? {});
    }

    private setupFormConfigGroups() {
        if (this.config) {
            // Create subgroups per section in the config form group, with the section key as group name
            const cfgGroup = this.ctlGroupConfig;
            Object.keys(this.config.bySection)
                .forEach(s => cfgGroup.addControl(s, this.fb.nonNullable.group({}), {emitEvent: false}));
        }
    }
}
