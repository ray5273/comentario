import { Component, Inject, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
    faAngleDown,
    faCalendarXmark,
    faCircleQuestion,
    faClone, faEraser,
    faFileExport,
    faFileImport,
    faSnowflake,
    faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { Paths } from '../../../../_utils/consts';
import { ApiGeneralService, Domain } from '../../../../../generated-api';
import { ToastService } from '../../../../_services/toast.service';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { DomainSelectorService } from '../../_services/domain-selector.service';
import { DomainBadgeComponent } from '../../badges/domain-badge/domain-badge.component';
import { SpinnerDirective } from '../../../tools/_directives/spinner.directive';
import { ConfirmDirective } from '../../../tools/_directives/confirm.directive';
import { DomainEventService } from '../../_services/domain-event.service';

@UntilDestroy()
@Component({
    selector: 'app-domain-operations',
    templateUrl: './domain-operations.component.html',
    imports: [
        DomainBadgeComponent,
        RouterLink,
        FaIconComponent,
        SpinnerDirective,
        ConfirmDirective,
        NgbCollapseModule,
        ReactiveFormsModule,
    ],
})
export class DomainOperationsComponent implements OnInit {

    /** Domain being displayed. */
    domain?: Domain;

    isDangerZoneCollapsed = true;

    readonly downloading = new ProcessingStatus();
    readonly freezing    = new ProcessingStatus();
    readonly purging     = new ProcessingStatus();
    readonly clearing    = new ProcessingStatus();
    readonly deleting    = new ProcessingStatus();

    readonly Paths = Paths;

    readonly purgeForm = this.fb.nonNullable.group({
        markedDeleted:      true,
        userCreatedDeleted: false,
    });

    // Icons
    readonly faAngleDown       = faAngleDown;
    readonly faCalendarXmark   = faCalendarXmark;
    readonly faCircleQuestion  = faCircleQuestion;
    readonly faClone           = faClone;
    readonly faEraser          = faEraser;
    readonly faFileExport      = faFileExport;
    readonly faFileImport      = faFileImport;
    readonly faSnowflake       = faSnowflake;
    readonly faTrashAlt        = faTrashAlt;

    constructor(
        @Inject(DOCUMENT) private readonly doc: Document,
        private readonly router: Router,
        private readonly fb: FormBuilder,
        private readonly toastSvc: ToastService,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly domainEventSvc: DomainEventService,
    ) {}

    get freezeAction(): string {
        return this.domain?.isReadonly ? $localize`Unfreeze` : $localize`Freeze`;
    }

    ngOnInit(): void {
        // Subscribe to domain changes
        this.domainSelectorSvc.domainMeta(true)
            .pipe(untilDestroyed(this))
            .subscribe(meta => this.domain = meta.domain);
    }

    exportData() {
        // Trigger an export
        this.api.domainExport(this.domain!.id!)
            .pipe(this.downloading.processing())
            .subscribe(b => {
                const filename = `${this.domain!.host}-${new Date().toISOString()}.json.gz`.replaceAll(':', '');

                // Create a link element
                const a = this.doc.createElement('a');
                a.href = URL.createObjectURL(b);
                a.download = filename;

                // "Click" the link: this should cause a file download
                a.click();

                // Cleanup
                URL.revokeObjectURL(a.href);

                // Add a toast
                this.toastSvc.success({messageId: 'file-downloaded', details: filename});
            });
    }

    delete() {
        // Run deletion with the API
        const domain = this.domain!;
        this.api.domainDelete(domain.id!)
            .pipe(this.deleting.processing())
            .subscribe(() => {
                // Deselect the domain
                this.domainSelectorSvc.setDomainId(undefined);
                // Emit a domain event
                this.domainEventSvc.events.next({kind: 'delete', domain});
                // Add a toast
                this.toastSvc.success({messageId: 'domain-deleted', keepOnRouteChange: true});
                // Navigate to the domain list page
                this.router.navigate([Paths.manage.domains]);
            });
    }

    purgeDomain() {
        // Run purging with the API
        this.api.domainPurge(this.domain!.id!, this.purgeForm.value)
            .pipe(this.purging.processing())
            // Add a toast
            .subscribe(r => this.toastSvc.success({messageId: 'domain-cleared', details: $localize`Removed ${r.commentCount} comment(s)`}));
    }

    clearDomain() {
        // Run cleaning with the API
        this.api.domainClear(this.domain!.id!)
            .pipe(this.clearing.processing())
            .subscribe(() => {
                // Add a success toast
                this.toastSvc.success('domain-cleared');
                // Reload the domain to reflect updated counters
                this.domainSelectorSvc.reload();
            });
    }

    toggleFrozen() {
        // Run toggle with the API
        this.api.domainReadonly(this.domain!.id!, {readonly: !this.domain!.isReadonly})
            .pipe(this.freezing.processing())
            .subscribe(() => {
                // Add a toast
                this.toastSvc.success('data-saved');
                // Reload the details
                this.domainSelectorSvc.reload();
            });
    }
}
