import { Component, OnInit } from '@angular/core';
import { ApiGeneralService, DashboardTotals200Response } from '../../../../generated-api';
import { ProcessingStatus } from '../../../_utils/processing-status';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {

    data?: DashboardTotals200Response;

    readonly loading = new ProcessingStatus();

    constructor(
        private readonly api: ApiGeneralService,
    ) {}

    ngOnInit(): void {
        // Fetch the data from the backend
        this.api.dashboardTotals()
            .pipe(this.loading.processing())
            .subscribe(d => this.data = d);
    }
}
