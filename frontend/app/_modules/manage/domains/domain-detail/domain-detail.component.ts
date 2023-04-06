import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Location } from '@angular/common';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ApiOwnerService, Domain } from '../../../../../generated-api';
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

    constructor(
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

    ngOnInit(): void {
        // Subscribe to route changes to be able to reload data on same route
        this.router.events
            .pipe(untilDestroyed(this))
            .subscribe(e => e instanceof NavigationEnd && this.reload());

        // Fetch the data from the backend
        this.reload();
    }

    reload() {
        this.api.domainGet(this.route.snapshot.paramMap.get('host') as string)
            .pipe(this.loading.processing())
            .subscribe(d => this.domain = d);
    }
}
