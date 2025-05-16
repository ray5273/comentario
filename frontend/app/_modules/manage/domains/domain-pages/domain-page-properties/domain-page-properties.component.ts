import { Component, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { BehaviorSubject, combineLatestWith, EMPTY, switchMap, tap } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { UntilDestroy } from '@ngneat/until-destroy';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBoxesPacking, faEdit, faRotate, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService } from '../../../../../../generated-api';
import { DomainSelectorService } from '../../../_services/domain-selector.service';
import { Paths } from '../../../../../_utils/consts';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { ToastService } from '../../../../../_services/toast.service';
import { SpinnerDirective } from '../../../../tools/_directives/spinner.directive';
import { CommentListComponent } from '../../comments/comment-list/comment-list.component';
import { NoDataComponent } from '../../../../tools/no-data/no-data.component';
import { ConfirmDirective } from '../../../../tools/_directives/confirm.directive';
import { DomainPageDetailsComponent } from '../domain-page-details/domain-page-details.component';

@UntilDestroy()
@Component({
    selector: 'app-domain-page-properties',
    templateUrl: './domain-page-properties.component.html',
    imports: [
        SpinnerDirective,
        FaIconComponent,
        RouterLink,
        CommentListComponent,
        NoDataComponent,
        ConfirmDirective,
        DomainPageDetailsComponent,
    ],
})
export class DomainPagePropertiesComponent {

    /** ID of the domain page to display properties for. */
    readonly id = input<string>();

    /** The current domain/user metadata. */
    readonly domainMeta = toSignal(this.domainSelectorSvc.domainMeta(true));

    private readonly reload$ = new BehaviorSubject<void>(undefined);

    readonly Paths = Paths;
    readonly loading       = new ProcessingStatus();
    readonly deleting      = new ProcessingStatus();
    readonly updatingTitle = new ProcessingStatus();

    /** The current domain page. */
    readonly page = toSignal(
        toObservable(this.id)
            .pipe(
                combineLatestWith(this.reload$),
                switchMap(([id]) => id ? this.api.domainPageGet(id).pipe(this.loading.processing(), map(r => r.page)) : EMPTY)));

    // Icons
    readonly faBoxesPacking = faBoxesPacking;
    readonly faEdit         = faEdit;
    readonly faRotate       = faRotate;
    readonly faTrashAlt     = faTrashAlt;

    constructor(
        private readonly router: Router,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly toastSvc: ToastService,
    ) {}

    updateTitle() {
        const id = this.id();
        if (id) {
            this.api.domainPageUpdateTitle(id)
                .pipe(
                    this.updatingTitle.processing(),
                    // Add a toast
                    tap(d => this.toastSvc.success(d.changed ? 'data-updated' : 'no-change')),
                    // Reload on changes
                    filter(d => d.changed!))
                .subscribe(() => this.reload$.next());
        }
    }

    delete() {
        const id = this.id();
        if (id) {
            this.api.domainPageDelete(id)
                .pipe(this.deleting.processing())
                .subscribe(() => {
                    // Add a success toast
                    this.toastSvc.success({messageId: 'domain-page-deleted', keepOnRouteChange: true});
                    // Go back to the page list
                    this.router.navigate([Paths.manage.domains, this.page()!.domainId, 'pages']);
                });
        }
    }
}
