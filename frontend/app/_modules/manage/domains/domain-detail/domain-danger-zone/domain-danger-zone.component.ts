import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { faCalendarXmark, faCircleQuestion, faSnowflake, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { ApiOwnerService, Domain, DomainState } from '../../../../../../generated-api';
import { Paths } from '../../../../../_utils/consts';
import { ToastService } from '../../../../../_services/toast.service';

@Component({
    selector: 'app-domain-danger-zone',
    templateUrl: './domain-danger-zone.component.html',
})
export class DomainDangerZoneComponent {

    @Input()
    domain?: Domain;

    @Output()
    updated = new EventEmitter<void>();

    readonly Paths = Paths;

    // Icons
    readonly faCalendarXmark  = faCalendarXmark;
    readonly faCircleQuestion = faCircleQuestion;
    readonly faSnowflake      = faSnowflake;
    readonly faTrashAlt       = faTrashAlt;

    constructor(
        private readonly router: Router,
        private readonly toastSvc: ToastService,
        private readonly api: ApiOwnerService,
    ) {}

    get freezeAction(): string {
        return this.domain?.state === DomainState.Frozen ? $localize`Unfreeze` : $localize`Freeze`;
    }

    delete() {
        // Run deletion with the API
        this.api.domainDelete(this.domain!.host)
            .subscribe(() => {
                // Add a toast
                this.toastSvc.success('domain-deleted').keepOnRouteChange();
                // Navigate to the domain list page
                this.router.navigate([Paths.manage.domains]);
            });
    }

    clearComments() {
        // Run cleaning with the API
        this.api.domainClear(this.domain!.host)
            // Add a toast
            .subscribe(() => this.toastSvc.success('domain-cleared'));
    }

    toggleFrozen() {
        // Run toggle with the API
        this.api.domainToggleFrozen(this.domain!.host)
            .subscribe(() => {
                // Add a toast
                this.toastSvc.success('data-saved');
                // Notify the subscribers
                this.updated.next();
            });
    }
}
