import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { DOCUMENT, Location } from '@angular/common';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
    faBars,
    faCalendarXmark,
    faCircleQuestion,
    faClone,
    faEdit,
    faFileExport,
    faFileImport,
    faSnowflake,
    faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ApiOwnerService, Domain, DomainState } from '../../../../../generated-api';
import { Paths } from '../../../../_utils/consts';
import { ToastService } from '../../../../_services/toast.service';
import { ConfigService } from '../../../../_services/config.service';
import { DocsService } from '../../../../_services/docs.service';

@UntilDestroy()
@Component({
    selector: 'app-domain-detail',
    templateUrl: './domain-detail.component.html',
})
export class DomainDetailComponent implements OnInit {

    activeTab = 'installation';
    domain?: Domain;

    readonly loading = new ProcessingStatus();
    readonly Paths = Paths;
    readonly snippet: string;

    // Icons
    readonly faBars            = faBars;
    readonly faCalendarXmark   = faCalendarXmark;
    readonly faCircleQuestion  = faCircleQuestion;
    readonly faClone           = faClone;
    readonly faEdit            = faEdit;
    readonly faFileExport      = faFileExport;
    readonly faFileImport      = faFileImport;
    readonly faSnowflake       = faSnowflake;
    readonly faTrashAlt        = faTrashAlt;

    constructor(
        @Inject(DOCUMENT) private readonly doc: Document,
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly api: ApiOwnerService,
        private readonly toastSvc: ToastService,
        private readonly cfgSvc: ConfigService,
        readonly docsSvc: DocsService,
    ) {
        const script = Location.joinWithSlash(this.cfgSvc.clientConfig.baseUrl, 'comentario.js');
        this.snippet =
            `<script defer src="${script}"></script>\n` +
            `<div id="comentario"></div>`;
    }

    get freezeAction(): string {
        return this.domain?.state === DomainState.Frozen ? $localize`Unfreeze` : $localize`Freeze`;
    }

    ngOnInit(): void {
        // Subscribe to route changes to be able to reload data on same route
        this.router.events
            .pipe(untilDestroyed(this))
            .subscribe(e => e instanceof NavigationEnd && this.reload());

        // Fetch the data from the backend
        this.reload();
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

    exportData() {
        // Trigger an export
        this.api.domainExport(this.domain!.host)
            .subscribe(b => {
                // Create a link element
                const a = this.doc.createElement('a');
                a.href = URL.createObjectURL(b);
                a.download = `${this.domain!.host}-${new Date().toISOString()}.json.gz`;

                // "Click" the link: this should cause a file download
                a.click();

                // Cleanup
                URL.revokeObjectURL(a.href);
            });
    }

    toggleFrozen() {
        // Run toggle with the API
        this.api.domainToggleFrozen(this.domain!.host)
            .subscribe(() => {
                // Add a toast
                this.toastSvc.success('data-saved');
                // Reload the domain
                this.reload();
            });
    }

    reload() {
        this.api.domainGet(this.route.snapshot.paramMap.get('host') as string)
            .pipe(this.loading.processing())
            .subscribe(d => this.domain = d);
    }
}
