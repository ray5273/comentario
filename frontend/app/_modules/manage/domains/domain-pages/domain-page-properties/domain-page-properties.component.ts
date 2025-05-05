import { Component, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, combineLatestWith, EMPTY, switchMap, tap } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { UntilDestroy } from '@ngneat/until-destroy';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEdit, faRotate } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService } from '../../../../../../generated-api';
import { DomainSelectorService } from '../../../_services/domain-selector.service';
import { Paths } from '../../../../../_utils/consts';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { ToastService } from '../../../../../_services/toast.service';
import { SpinnerDirective } from '../../../../tools/_directives/spinner.directive';
import { ExternalLinkDirective } from '../../../../tools/_directives/external-link.directive';
import { CheckmarkComponent } from '../../../../tools/checkmark/checkmark.component';
import { DatetimePipe } from '../../../_pipes/datetime.pipe';
import { CommentListComponent } from '../../comments/comment-list/comment-list.component';
import { NoDataComponent } from '../../../../tools/no-data/no-data.component';
import { DomainRssLinkComponent } from '../../domain-rss-link/domain-rss-link.component';
import { InfoIconComponent } from '../../../../tools/info-icon/info-icon.component';

@UntilDestroy()
@Component({
    selector: 'app-domain-page-properties',
    templateUrl: './domain-page-properties.component.html',
    imports: [
        SpinnerDirective,
        FaIconComponent,
        RouterLink,
        ExternalLinkDirective,
        CheckmarkComponent,
        DatetimePipe,
        DecimalPipe,
        CommentListComponent,
        NoDataComponent,
        DomainRssLinkComponent,
        InfoIconComponent,
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
    readonly updatingTitle = new ProcessingStatus();

    /** The current domain page. */
    readonly page = toSignal(
        toObservable(this.id)
            .pipe(
                combineLatestWith(this.reload$),
                switchMap(([id]) => id ? this.api.domainPageGet(id).pipe(this.loading.processing(), map(r => r.page)) : EMPTY)));

    // Icons
    readonly faEdit   = faEdit;
    readonly faRotate = faRotate;

    constructor(
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
}
