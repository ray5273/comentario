import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faRotate } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, Domain, DomainPage, DomainUser, Principal } from '../../../../../generated-api';
import { DomainSelectorService } from '../../_services/domain-selector.service';
import { Paths } from '../../../../_utils/consts';
import { ProcessingStatus } from '../../../../_utils/processing-status';

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

    // Icons
    readonly faRotate = faRotate;

    constructor(
        private readonly route: ActivatedRoute,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}

    /**
     * Whether the current user is the owner of the domain (or a superuser).
     */
    get isOwner(): boolean {
        return !!(this.principal?.isSuperuser || this.domainUser?.isOwner);
    }

    ngOnInit(): void {
        this.route.paramMap
            .pipe(switchMap(pm => this.api.domainPageGet(pm.get('id')!).pipe(this.loading.processing())))
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
        // TODO
    }
}
