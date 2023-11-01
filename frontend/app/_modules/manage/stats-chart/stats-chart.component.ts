import { Component, Inject, Input, LOCALE_ID } from '@angular/core';
import { DatePipe } from '@angular/common';
import { debounceTime, Subject } from 'rxjs';
import { ChartDataset, ChartOptions } from 'chart.js';
import { ApiGeneralService } from '../../../../generated-api';
import { ProcessingStatus } from '../../../_utils/processing-status';

@Component({
    selector: 'app-stats-chart',
    templateUrl: './stats-chart.component.html',
    styleUrls: ['./stats-chart.component.scss'],
})
export class StatsChartComponent {

    /** Actual number of days of statistics provided by the backend. */
    countDays = 0;
    /** Total number of views over the returned stats period. */
    countViews?: number;
    /** Total number of comments over the returned stats period. */
    countComments?: number;

    readonly loading = new ProcessingStatus();
    readonly chartOptions: ChartOptions = {
        maintainAspectRatio: false,
        backgroundColor: '#00000000',
        plugins: {
            legend: {display: false},
        },
        scales: {
            y: {
                // We expect no negative values
                min: 0,
            },
            x: {
                ticks: {
                    // Only draw one tick per week
                    callback: (_, index) => (this.chartLabels.length - index) % 7 === 1 ? this.chartLabels[index] : null,
                }
            }
        },
    };
    readonly chartLabels:       string[] = [];
    readonly chartDataViews:    ChartDataset[] = [{
        label:                $localize`Views`,
        data:                 [],
        borderColor:          '#339b11',
        backgroundColor:      '#339b1120',
        pointBackgroundColor: '#339b11',
        tension:              0.5,
        fill:                 true,
    }];
    readonly chartDataComments: ChartDataset[] = [{
        label:                $localize`Comments`,
        data:                 [],
        borderColor:          '#376daf',
        backgroundColor:      '#376daf20',
        pointBackgroundColor: '#376daf',
        tension:              0.5,
        fill:                 true,
    }];

    private _domainId?: string;
    private _numberOfDays = 30;
    private reload$ = new Subject<void>();

    constructor(
        @Inject(LOCALE_ID) private readonly locale: string,
        private readonly api: ApiGeneralService,
    ) {
        // Reload on a property change, with some delay
        this.reload$.pipe(debounceTime(200)).subscribe(() => this.reload());
    }

    /**
     * ID of the domain to collect the statistics for. If an empty string, statistics for all domains of the current
     * user is collected.
     */
    @Input()
    set domainId(id: string | undefined) {
        this._domainId = id;
        this.reload$.next();
    }

    /**
     * Number of days of statistics to request from the backend.
     */
    @Input()
    set numberOfDays(n: number) {
        this._numberOfDays = n;
        this.reload$.next();
    }

    private resetChart() {
        this.chartLabels.splice(0);
        this.chartDataViews[0].data.splice(0);
        this.chartDataComments[0].data.splice(0);
    }

    private reload() {
        // Undefined domain means it's uninitialised yet
        if (this._domainId === undefined) {
            this.resetChart();
            return;
        }

        // Request data from the backend
        (this._domainId ? this.api.domainDailyStats(this._domainId, this._numberOfDays) : this.api.dashboardDailyStats(this._numberOfDays))
            .pipe(this.loading.processing())
            .subscribe(r => {
                // Reset the chart
                this.resetChart();

                // Fetch the number of days
                this.countDays = r.commentCounts?.length || 0;
                if (!this.countDays) {
                    return;
                }

                // Generate labels
                this.chartLabels.push(...this.getDates(this.countDays));

                // Add chart data
                this.chartDataViews[0].data.push(...r.viewCounts!);
                this.chartDataComments[0].data.push(...r.commentCounts!);

                // Count totals
                this.countViews    = r.viewCounts!.reduce((acc, n) => acc + n, 0);
                this.countComments = r.commentCounts!.reduce((acc, n) => acc + n, 0);
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
