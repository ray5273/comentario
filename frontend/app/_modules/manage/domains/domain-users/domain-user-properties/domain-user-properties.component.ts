import { Component, Input, OnInit } from '@angular/core';
import { combineLatestWith, ReplaySubject, switchMap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, DomainUser, Principal, User } from '../../../../../../generated-api';
import { DomainSelectorService } from '../../../_services/domain-selector.service';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { Paths } from '../../../../../_utils/consts';

@UntilDestroy()
@Component({
    selector: 'app-domain-user-properties',
    templateUrl: './domain-user-properties.component.html',
})
export class DomainUserPropertiesComponent implements OnInit {

    /** The domain user in question. */
    domainUser?: DomainUser;

    /** The user corresponding to domainUser. */
    user?: User;

    /** Currently authenticated principal. */
    principal?: Principal;

    readonly Paths = Paths;
    readonly loading = new ProcessingStatus();

    // Icons
    readonly faEdit = faEdit;

    private readonly id$ = new ReplaySubject<string>(1);

    constructor(
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
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
                // Blend with user ID
                combineLatestWith(this.id$),
                // Fetch the domain user and the corresponding user
                switchMap(([meta, id]) => {
                    this.principal = meta.principal;
                    return this.api.domainUserGet(id, meta.domain!.id!).pipe(this.loading.processing());
                }))
            .subscribe(r => {
                this.domainUser = r.domainUser;
                this.user       = r.user;
            });
    }
}
