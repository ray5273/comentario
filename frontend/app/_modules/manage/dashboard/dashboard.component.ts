import { Component, OnInit } from '@angular/core';
import { ApiOwnerService, DashboardDataGet200Response } from '../../../../generated-api';
import { ProcessingStatus } from '../../../_utils/processing-status';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {

    data?: DashboardDataGet200Response;

    readonly loading = new ProcessingStatus();

    constructor(
        private readonly api: ApiOwnerService,
    ) {}

    ngOnInit(): void {
        // Fetch the data from the backend
        this.api.dashboardDataGet()
            .pipe(this.loading.processing())
            .subscribe(d => this.data = d);
    }
}
