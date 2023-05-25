import { Component, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faClone, faFileExport, faFileImport } from '@fortawesome/free-solid-svg-icons';
import { Paths } from '../../../../../_utils/consts';
import { ApiOwnerService, Domain } from '../../../../../../generated-api';
import { ToastService } from '../../../../../_services/toast.service';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { DomainDetailComponent } from '../domain-detail.component';

@UntilDestroy()
@Component({
    selector: 'app-domain-impex',
    templateUrl: './domain-impex.component.html',
})
export class DomainImpexComponent {

    domain?: Domain;

    readonly downloading = new ProcessingStatus();
    readonly Paths = Paths;

    // Icons
    readonly faClone      = faClone;
    readonly faFileExport = faFileExport;
    readonly faFileImport = faFileImport;

    constructor(
        @Inject(DOCUMENT) private readonly doc: Document,
        private readonly toastSvc: ToastService,
        private readonly api: ApiOwnerService,
        details: DomainDetailComponent,
    ) {
        // Subscribe to domain changes
        details.domain
            .pipe(untilDestroyed(this))
            .subscribe(d => this.domain = d);
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
}
