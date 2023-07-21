import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, Domain, DomainUser, Principal, User } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { AuthService } from '../../../../_services/auth.service';
import { Paths } from '../../../../_utils/consts';
import { DomainSelectorService } from '../../_services/domain-selector.service';

@UntilDestroy()
@Component({
    selector: 'app-user-properties',
    templateUrl: './user-properties.component.html',
})
export class UserPropertiesComponent implements OnInit {

    /** The selected user whose properties are displayed. */
    user?: User;

    /** Domain users for the selected user. */
    domainUsers?: DomainUser[];

    /** Domains of domainUsers. */
    domains = new Map<string, Domain>();

    /** Currently selected domain. */
    domain?: Domain;

    /** Logged-in principal. */
    principal?: Principal;

    readonly Paths = Paths;
    readonly loading = new ProcessingStatus();

    // Icons
    readonly faEdit = faEdit;

    constructor(
        private readonly route: ActivatedRoute,
        private readonly api: ApiGeneralService,
        private readonly authSvc: AuthService,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}

    ngOnInit(): void {
        this.route.paramMap
            .pipe(switchMap(pm => this.api.userGet(pm.get('id')!).pipe(this.loading.processing())))
            .subscribe(r => {
                this.user        = r.user;
                this.domainUsers = r.domainUsers;

                // Make a domain map
                this.domains.clear();
                r.domains?.forEach(d => this.domains.set(d.id!, d));
            });

        // Subscribe to domain/principal changes
        this.domainSelectorSvc.domainUserIdps
            .pipe(untilDestroyed(this))
            .subscribe(d => {
                this.domain    = d.domain;
                this.principal = d.principal;
            });
    }
}
