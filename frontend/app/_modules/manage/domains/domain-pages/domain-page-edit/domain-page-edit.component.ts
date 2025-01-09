import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { combineLatestWith, ReplaySubject, switchMap } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiGeneralService, DomainPage } from '../../../../../../generated-api';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { DomainMeta, DomainSelectorService } from '../../../_services/domain-selector.service';
import { ToastService } from '../../../../../_services/toast.service';
import { Paths } from '../../../../../_utils/consts';

@UntilDestroy()
@Component({
    selector: 'app-domain-page-edit',
    templateUrl: './domain-page-edit.component.html',
})
export class DomainPageEditComponent implements OnInit {

    /** Domain page being edited. */
    page?: DomainPage;

    /** Domain/user metadata. */
    domainMeta?: DomainMeta;

    readonly loading = new ProcessingStatus();
    readonly saving  = new ProcessingStatus();
    readonly form = this.fb.nonNullable.group({
        readOnly: false,
        path:     [{value: '', disabled: true}, [Validators.required, Validators.pattern(/^\//), Validators.maxLength(2075)]],
    });

    /** Page ID, set via input binding. */
    private readonly id$ = new ReplaySubject<string>(1);

    constructor(
        private readonly fb: FormBuilder,
        private readonly router: Router,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly toastSvc: ToastService,
    ) {}

    @Input()
    set id(id: string) {
        this.id$.next(id);
    }

    ngOnInit(): void {
        // Subscribe to domain changes
        this.domainSelectorSvc.domainMeta(true)
            .pipe(
                untilDestroyed(this),
                // Nothing can be loaded unless there's a domain
                filter(meta => !!meta.domain),
                // Blend with page ID
                combineLatestWith(this.id$),
                // Fetch the domain page
                switchMap(([meta, id]) => {
                    this.domainMeta = meta;
                    return this.api.domainPageGet(id).pipe(this.loading.processing());
                }))
            .subscribe(r => {
                this.page = r.page;
                this.form.setValue({
                    readOnly: !!r.page!.isReadonly,
                    path:     r.page!.path ?? '',
                });

                // Only domain managers are allowed to edit the path
                if (this.domainMeta?.canManageDomain) {
                    this.form.controls.path.enable();
                }
            });
    }

    submit() {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.page && this.form.valid) {
            const val = this.form.value;
            this.api.domainPageUpdate(this.page.id!, {
                    isReadonly: val.readOnly!,
                    path:       val.path || this.page.path,
                })
                .pipe(this.saving.processing())
                .subscribe(() => {
                    // Add a success toast
                    this.toastSvc.success({messageId: 'data-saved', keepOnRouteChange: true});
                    // Go back to the domain page properties
                    this.router.navigate([Paths.manage.domains, this.page!.domainId!, 'pages', this.page!.id]);
                });
        }
    }
}
