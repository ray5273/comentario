import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faBars, faClone, faEdit, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ApiOwnerService, Domain } from '../../../../../generated-api';
import { Paths } from '../../../../_utils/consts';
import { ToastService } from '../../../../_services/toast.service';

@UntilDestroy()
@Component({
    selector: 'app-domain-detail',
    templateUrl: './domain-detail.component.html',
})
export class DomainDetailComponent implements OnInit {

    domain?: Domain;
    idps?: {name: string; enabled: boolean}[];

    readonly loading = new ProcessingStatus();
    readonly Paths = Paths;

    // Icons
    readonly faBars     = faBars;
    readonly faClone    = faClone;
    readonly faEdit     = faEdit;
    readonly faTrashAlt = faTrashAlt;

    constructor(
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly api: ApiOwnerService,
        private readonly toastSvc: ToastService,
    ) {}

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

    private reload() {
        this.api.domainGet(this.route.snapshot.paramMap.get('host') as string)
            .pipe(this.loading.processing())
            .subscribe(d => {
                this.domain = d;
                this.idps = Object.entries(d.idps as any).map(([name, v]) => ({name, enabled: !!v}));
            });
    }
}
