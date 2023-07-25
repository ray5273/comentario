import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatestWith, switchMap, tap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faRotate } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, DomainPage } from '../../../../../generated-api';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';
import { Paths } from '../../../../_utils/consts';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ToastService } from '../../../../_services/toast.service';

@UntilDestroy()
@Component({
    selector: 'app-page-properties',
    templateUrl: './page-properties.component.html',
})
export class PagePropertiesComponent implements OnInit {

    /** The current domain page. */
    page?: DomainPage;

    /** Domain/user metadata. */
    domainMeta?: DomainMeta;

    readonly Paths = Paths;
    readonly loading = new ProcessingStatus();
    readonly updatingTitle = new ProcessingStatus();

    // Icons
    readonly faRotate = faRotate;

    private readonly reload$ = new BehaviorSubject<void>(undefined);

    constructor(
        private readonly route: ActivatedRoute,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly toastSvc: ToastService,
    ) {}

    ngOnInit(): void {
        this.route.paramMap
            .pipe(
                // Update whenever reload signal is emitted
                combineLatestWith(this.reload$),
                // Fetch page details
                switchMap(([pm]) => this.api.domainPageGet(pm.get('id')!).pipe(this.loading.processing())))
            .subscribe(r => {
                this.page = r.page;

                // Make sure the correct domain is selected
                this.domainSelectorSvc.setDomainId(this.page?.domainId);
            });

        // Subscribe to domain changes
        this.domainSelectorSvc.domainMeta
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
            .subscribe(() => this.reload$.next());
    }
}
