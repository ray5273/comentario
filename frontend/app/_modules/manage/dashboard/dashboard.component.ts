import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiGeneralService, Principal, StatsTotals } from '../../../../generated-api';
import { ProcessingStatus } from '../../../_utils/processing-status';
import { AuthService } from '../../../_services/auth.service';

@UntilDestroy()
@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {

    principal?: Principal;
    totals?: StatsTotals;

    readonly loading = new ProcessingStatus();

    constructor(
        private readonly api: ApiGeneralService,
        private readonly authSvc: AuthService,
    ) {}

    ngOnInit(): void {
        // Subscribe to principal changes
        this.authSvc.principal
            .pipe(untilDestroyed(this))
            .subscribe(p => this.principal = p ?? undefined);

        // Fetch the data from the backend
        this.api.dashboardTotals()
            .pipe(this.loading.processing())
            .subscribe(t => this.totals = t);
    }
}
