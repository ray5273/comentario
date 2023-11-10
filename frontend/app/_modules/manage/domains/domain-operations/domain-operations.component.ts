import { Component, Inject, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
    faAngleDown,
    faCalendarXmark,
    faCircleQuestion,
    faClone,
    faFileExport,
    faFileImport,
    faSnowflake,
    faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';
import { Paths } from '../../../../_utils/consts';
import { ApiGeneralService, Domain } from '../../../../../generated-api';
import { ToastService } from '../../../../_services/toast.service';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { DomainSelectorService } from '../../_services/domain-selector.service';

@UntilDestroy()
@Component({
    selector: 'app-domain-operations',
    templateUrl: './domain-operations.component.html',
})
export class DomainOperationsComponent implements OnInit {

    /** Domain being displayed. */
    domain?: Domain;

    isDangerZoneCollapsed = true;

    readonly downloading = new ProcessingStatus();
    readonly freezing    = new ProcessingStatus();
    readonly clearing    = new ProcessingStatus();
    readonly deleting    = new ProcessingStatus();

    readonly Paths = Paths;

    // Icons
    readonly faAngleDown       = faAngleDown;
    readonly faCalendarXmark   = faCalendarXmark;
    readonly faCircleQuestion  = faCircleQuestion;
    readonly faClone           = faClone;
    readonly faFileExport      = faFileExport;
    readonly faFileImport      = faFileImport;
    readonly faSnowflake       = faSnowflake;
    readonly faTrashAlt        = faTrashAlt;

    constructor(
        @Inject(DOCUMENT) private readonly doc: Document,
        private readonly router: Router,
        private readonly toastSvc: ToastService,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
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
                // Create a link element
                const a = this.doc.createElement('a');
                a.href = URL.createObjectURL(b);
                a.download = `${this.domain!.host}-${new Date().toISOString()}.json.gz`;

                // "Click" the link: this should cause a file download
                a.click();

                // Cleanup
                URL.revokeObjectURL(a.href);

                // Add a toast
                this.toastSvc.success('file-downloaded');
            });
    }

    delete() {
        // Run deletion with the API
        this.api.domainDelete(this.domain!.id!)
            .pipe(this.deleting.processing())
            .subscribe(() => {
                // Deselect the domain
                this.domainSelectorSvc.setDomainId(undefined);
                // Add a toast
                this.toastSvc.success('domain-deleted').keepOnRouteChange();
                // Navigate to the domain list page
                this.router.navigate([Paths.manage.domains]);
            });
    }

    clearComments() {
        // Run cleaning with the API
        this.api.domainClear(this.domain!.id!)
            .pipe(this.clearing.processing())
            // Add a toast
            .subscribe(() => this.toastSvc.success('domain-cleared'));
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
