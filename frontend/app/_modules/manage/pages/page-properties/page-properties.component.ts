import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatestWith, switchMap, tap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faRotate } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, Domain, DomainPage, DomainUser, Principal } from '../../../../../generated-api';
import { DomainSelectorService } from '../../_services/domain-selector.service';
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

    /** Logged-in principal. */
    principal?: Principal;

    /** Currently selected domain. */
    domain?: Domain;

    /** User in the currently selected domain. */
    domainUser?: DomainUser;

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

    /**
     * Whether the current user is an owner of the domain (or a superuser).
     */
    get isOwner(): boolean {
        return !!(this.principal?.isSuperuser || this.domainUser?.isOwner);
    }

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
        this.domainSelectorSvc.domainUserIdps
            .pipe(untilDestroyed(this))
            .subscribe(data => {
                this.domain     = data.domain;
                this.domainUser = data.domainUser;
                this.principal  = data.principal;
            });
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
