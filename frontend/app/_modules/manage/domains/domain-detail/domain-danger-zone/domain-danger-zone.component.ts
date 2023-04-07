import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faCalendarXmark, faCircleQuestion, faSnowflake, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { ApiOwnerService, Domain, DomainState } from '../../../../../../generated-api';
import { Paths } from '../../../../../_utils/consts';
import { ToastService } from '../../../../../_services/toast.service';
import { DomainDetailComponent } from '../domain-detail.component';
import { ProcessingStatus } from '../../../../../_utils/processing-status';

@UntilDestroy()
@Component({
    selector: 'app-domain-danger-zone',
    templateUrl: './domain-danger-zone.component.html',
})
export class DomainDangerZoneComponent {

    domain?: Domain;

    readonly Paths = Paths;
    readonly freezing = new ProcessingStatus();
    readonly clearing = new ProcessingStatus();
    readonly deleting = new ProcessingStatus();

    // Icons
    readonly faCalendarXmark  = faCalendarXmark;
    readonly faCircleQuestion = faCircleQuestion;
    readonly faSnowflake      = faSnowflake;
    readonly faTrashAlt       = faTrashAlt;

    constructor(
        private readonly router: Router,
        private readonly toastSvc: ToastService,
        private readonly api: ApiOwnerService,
        private readonly details: DomainDetailComponent,
    ) {
        // Subscribe to domain changes
        details.domain
            .pipe(untilDestroyed(this))
            .subscribe(d => this.domain = d);
    }

    get freezeAction(): string {
        return this.domain?.state === DomainState.Frozen ? $localize`Unfreeze` : $localize`Freeze`;
    }

    delete() {
        // Run deletion with the API
        this.api.domainDelete(this.domain!.host)
            .pipe(this.deleting.processing())
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
            .pipe(this.clearing.processing())
            // Add a toast
            .subscribe(() => this.toastSvc.success('domain-cleared'));
    }

    toggleFrozen() {
        // Run toggle with the API
        this.api.domainToggleFrozen(this.domain!.host)
            .pipe(this.freezing.processing())
            .subscribe(() => {
                // Add a toast
                this.toastSvc.success('data-saved');
                // Reload the details
                this.details.reload();
            });
    }
}
