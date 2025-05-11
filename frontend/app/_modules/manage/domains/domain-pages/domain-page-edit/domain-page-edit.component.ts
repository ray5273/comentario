import { Component, effect, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { EMPTY, switchMap } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiGeneralService, DomainPage } from '../../../../../../generated-api';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { DomainMeta, DomainSelectorService } from '../../../_services/domain-selector.service';
import { ToastService } from '../../../../../_services/toast.service';
import { Paths } from '../../../../../_utils/consts';
import { SpinnerDirective } from '../../../../tools/_directives/spinner.directive';
import { ValidatableDirective } from '../../../../tools/_directives/validatable.directive';

@UntilDestroy()
@Component({
    selector: 'app-domain-page-edit',
    templateUrl: './domain-page-edit.component.html',
    imports: [
        ReactiveFormsModule,
        SpinnerDirective,
        RouterLink,
        ValidatableDirective,
    ],
})
export class DomainPageEditComponent {

    /** ID of the domain page to edit. */
    readonly id = input<string>();

    /** Domain page being edited. */
    page?: DomainPage;

    /** Domain/user metadata. */
    domainMeta?: DomainMeta;

    readonly loading = new ProcessingStatus();
    readonly saving  = new ProcessingStatus();
    readonly form = this.fb.nonNullable.group({
        readOnly: false,
        path:     [{value: '', disabled: true}, [Validators.required, Validators.pattern(/^\//), Validators.maxLength(2075)]],
        title:    [{value: '', disabled: true}, [Validators.maxLength(100)]],
    });

    constructor(
        private readonly fb: FormBuilder,
        private readonly router: Router,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly toastSvc: ToastService,
    ) {
        // Load the domain page initially, and reload on changes
        effect(() => this.reload());
    }

    submit() {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.page && this.form.valid) {
            const val = this.form.value;
            this.api.domainPageUpdate(this.page.id!, {
                    isReadonly: val.readOnly!,
                    path:       val.path  ?? this.page.path,
                    title:      val.title ?? this.page.title,
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

    /**
     * Reload the domain page properties.
     * @private
     */
    private reload() {
        // Subscribe to domain changes
        this.domainSelectorSvc.domainMeta(true)
            .pipe(
                untilDestroyed(this),
                // Nothing can be loaded unless there's a domain
                filter(meta => !!meta.domain),
                // Fetch the domain page
                switchMap(meta => {
                    this.domainMeta = meta;
                    const id = this.id();
                    return id ? this.api.domainPageGet(id).pipe(this.loading.processing()) : EMPTY;
                }))
            .subscribe(r => {
                this.page = r.page;
                this.form.setValue({
                    readOnly: !!r.page?.isReadonly,
                    path:     r.page?.path ?? '',
                    title:    r.page?.title ?? '',
                });

                // Only domain managers are allowed to edit the path/title
                if (this.domainMeta?.canManageDomain) {
                    this.form.controls.path .enable();
                    this.form.controls.title.enable();
                }
            });
    }
}
