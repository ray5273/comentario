import { Component, Inject, LOCALE_ID } from '@angular/core';
import { DatePipe } from '@angular/common';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ChartDataset, ChartOptions } from 'chart.js';
import { ApiOwnerService, Domain } from '../../../../../../generated-api';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { DomainDetailComponent } from '../domain-detail.component';

@UntilDestroy()
@Component({
    selector: 'app-domain-stats',
    templateUrl: './domain-stats.component.html',
})
export class DomainStatsComponent {

    domain?: Domain;
    countDays = 0;
    countViews?: number;
    countComments?: number;

    readonly loading = new ProcessingStatus();
    readonly chartOptions: ChartOptions = {
        aspectRatio: 1.25,
        backgroundColor: '#00000000',
        plugins: {
            legend: {position: 'bottom'},
        },
        scales: {
            y: {
                min: 0, // We expect no negative values
            },
        },
    };
    chartLabels: string[] = [];
    chartData: ChartDataset[] = [];

    constructor(
        @Inject(LOCALE_ID) private readonly locale: string,
        private readonly api: ApiOwnerService,
        details: DomainDetailComponent,
    ) {
        // Subscribe to domain changes
        details.domain
            .pipe(untilDestroyed(this))
            .subscribe(d => {
                this.domain = d;
                this.reload();
            });
    }

    private reload() {
        if (!this.domain) {
            this.chartLabels = [];
            this.chartData = [];
            return;
        }

        // Request data from the backend
        this.api.domainStatistics(this.domain.host)
            .pipe(this.loading.processing())
            .subscribe(r => {
                // Fetch the number of days
                this.countDays = r.commentsLast30Days?.length || 0;

                // No data available
                if (!this.countDays) {
                    this.chartLabels = [];
                    this.chartData = [];
                    return;
                }

                // Data available
                this.chartData = [
                    {
                        label:                $localize`Comments`,
                        data:                 r.commentsLast30Days!,
                        borderColor:          '#376daf',
                        pointBackgroundColor: '#376daf',
                        tension:              0.5,
                    },
                    {
                        label:                $localize`Views`,
                        data:                 r.viewsLast30Days!,
                        borderColor:          '#339b11',
                        pointBackgroundColor: '#339b11',
                        tension:              0.5,
                    },
                ];

                // Generate 30 last dates
                this.chartLabels = this.getDates(this.countDays);

                // Count totals
                this.countViews    = r.viewsLast30Days!.reduce((acc, n) => acc + n, 0);
                this.countComments = r.commentsLast30Days!.reduce((acc, n) => acc + n, 0);
            });
    }

    private getDates(count: number): string[] {
        const r: string[] = [];
        const dp = new DatePipe(this.locale);

        // Begin from (today - count days)
        const d = new Date();
        d.setDate(d.getDate() - count + 1);

        // Add count items, moving forward in time
        for (let i = 0; i < count; i++) {
            r.push(dp.transform(d, 'shortDate') || '');
            d.setDate(d.getDate() + 1);
        }
        return r;
    }
}
