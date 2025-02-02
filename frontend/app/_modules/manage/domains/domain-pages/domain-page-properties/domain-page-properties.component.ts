import { Component, Input, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { tap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEdit, faRotate } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, DomainPage } from '../../../../../../generated-api';
import { DomainMeta, DomainSelectorService } from '../../../_services/domain-selector.service';
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
export class DomainPagePropertiesComponent implements OnInit {

    /** The current domain page. */
    page?: DomainPage;

    /** Domain/user metadata. */
    domainMeta?: DomainMeta;

    readonly Paths = Paths;
    readonly loading       = new ProcessingStatus();
    readonly updatingTitle = new ProcessingStatus();

    // Icons
    readonly faEdit   = faEdit;
    readonly faRotate = faRotate;

    /** Current page ID. */
    private _id?: string;

    constructor(
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly toastSvc: ToastService,
    ) {}

    @Input()
    set id(id: string) {
        this._id = id;
        this.reload();
    }

    ngOnInit(): void {
        // Subscribe to domain changes
        this.domainSelectorSvc.domainMeta(true)
            .pipe(untilDestroyed(this))
            .subscribe(meta => this.domainMeta = meta);
    }

    updateTitle() {
        this.api.domainPageUpdateTitle(this.page!.id!)
            .pipe(
                this.updatingTitle.processing(),
                // Add a toast
                tap(d => this.toastSvc.success(d.changed ? 'data-updated' : 'no-change')),
                // Reload on changes
                filter(d => d.changed!))
            .subscribe(() => this.reload());
    }

    private reload() {
        // Make sure there's a page ID
        if (!this._id) {
            this.page = undefined;
            return;
        }

        // Fetch the page
        this.api.domainPageGet(this._id)
            .pipe(this.loading.processing())
            .subscribe(r => {
                this.page = r.page;

                // Make sure the correct domain is selected
                this.domainSelectorSvc.setDomainId(this.page?.domainId);
            });
    }
}
