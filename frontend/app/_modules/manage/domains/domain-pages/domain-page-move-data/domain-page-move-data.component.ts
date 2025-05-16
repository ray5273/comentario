import { Component, computed, inject, input, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, EMPTY, filter, mergeWith, OperatorFunction, Subject, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NgbTypeahead } from '@ng-bootstrap/ng-bootstrap';
import { faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { InfoBlockComponent } from '../../../../tools/info-block/info-block.component';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { SpinnerDirective } from '../../../../tools/_directives/spinner.directive';
import { ApiGeneralService, DomainPage } from '../../../../../../generated-api';
import { DomainSelectorService } from '../../../_services/domain-selector.service';
import { DatetimePipe } from '../../../_pipes/datetime.pipe';
import { ValidatableDirective } from '../../../../tools/_directives/validatable.directive';
import { XtraValidators } from '../../../../../_utils/xtra-validators';
import { DialogService } from '../../../_services/dialog.service';
import { ToastService } from '../../../../../_services/toast.service';
import { Paths } from '../../../../../_utils/consts';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { Utils } from '../../../../../_utils/utils';

@UntilDestroy()
@Component({
    selector: 'app-domain-page-move-data',
    templateUrl: './domain-page-move-data.component.html',
    imports: [
        InfoBlockComponent,
        ReactiveFormsModule,
        SpinnerDirective,
        NgbTypeahead,
        RouterLink,
        DecimalPipe,
        DatetimePipe,
        NgTemplateOutlet,
        ValidatableDirective,
        FaIconComponent,
    ],
})
export class DomainPageMoveDataComponent {

    /** ID of the source domain page. */
    readonly id = input<string>();

    /** The current domain/user metadata. */
    readonly domainMeta = toSignal(inject(DomainSelectorService).domainMeta(true));

    /** Current domain ID. */
    readonly domainId = computed(() => this.domainMeta()?.domain?.id);

    readonly loading    = new ProcessingStatus();
    readonly submitting = new ProcessingStatus();

    readonly form = this.fb.group({
        targetPage: [null as DomainPage | null, [XtraValidators.hasProperty('id')]],
    });

    /** The source domain page. */
    readonly sourcePage = toSignal(
        toObservable(this.id)
            .pipe(switchMap(id => id ? this.api.domainPageGet(id).pipe(this.loading.processing(), map(r => r.page)) : EMPTY)));

    /** Source page URL. */
    readonly sourcePageUrl = computed(() => {
        const du = this.domainMeta()?.domain?.rootUrl;
        const pu = this.sourcePage()?.path;
        return du && pu ? Utils.joinUrl(du, pu) : undefined;
    });

    /** The target domain page. */
    readonly targetPage = toSignal(this.form.controls.targetPage.valueChanges);

    /** Target page URL. */
    readonly targetPageUrl = computed(() => {
        const du = this.domainMeta()?.domain?.rootUrl;
        const pu = this.targetPage()?.path;
        return du && pu ? Utils.joinUrl(du, pu) : undefined;
    });

    /** Target typeahead instance. */
    readonly targetTypeahead = viewChild<NgbTypeahead>('targetTypeahead');

    /** Typeahead input focus events. */
    readonly targetFocus = new Subject<string>();

    /** Typeahead input click events. */
    readonly targetClick = new Subject<string>();

    /** Typeahead search operator. */
    readonly targetSearch: OperatorFunction<string, DomainPage[]> = search$ =>
        search$.pipe(
            debounceTime(500),
            distinctUntilChanged(),
            // Also search on focus or click (with popup closed) to make the popup open
            mergeWith(this.targetFocus, this.targetClick.pipe(filter(() => !this.targetTypeahead()?.isPopupOpen()))),
            switchMap(s => {
                const dId = this.domainId();
                const srcId = this.sourcePage()?.id;
                if (dId && srcId) {
                    return this.api.domainPageList(this.domainId()!, s, 1, 'path', false)
                        // Exclude the source page from the list of possible targets
                        .pipe(map(r => r.pages?.filter(p => p.id !== srcId) ?? []));
                }
                return [];
            }));

    /** Typeahead input formatter. */
    readonly pageInputFormatter = (page: DomainPage) => page.path;

    // Icons
    readonly faUpRightFromSquare = faUpRightFromSquare;

    constructor(
        private readonly router: Router,
        private readonly fb: FormBuilder,
        private readonly api: ApiGeneralService,
        private readonly dialogSvc: DialogService,
        private readonly toastSvc: ToastService,
    ) {}

    async submit() {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Make sure there's a page and the form is valid
        const srcPage = this.sourcePage();
        if (!srcPage || !this.form.valid) {
            return;
        }

        // Show a confirmation dialog
        if (!await this.dialogSvc.confirm(
                $localize`Are you sure you want to move all data to the target page and permanently delete the source page?`,
                $localize`Move data`,
                {actionType: 'warning'})) {
            return;
        }

        // Run data move with the API
        this.api.domainPageMoveData(srcPage.id!, {targetPageId: this.form.controls.targetPage.value!.id!})
            .pipe(this.submitting.processing())
            .subscribe(() => {
                // Add a success toast
                this.toastSvc.success({messageId: 'data-updated', keepOnRouteChange: true});
                // Go back to the page list
                this.router.navigate([Paths.manage.domains, srcPage.domainId, 'pages']);
            });
    }
}
