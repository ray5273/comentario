import { Component, Inject, Input, LOCALE_ID } from '@angular/core';
import { DatePipe } from '@angular/common';
import { debounceTime, Subject } from 'rxjs';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { ApiGeneralService } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';

@Component({
    selector: 'app-daily-stats-chart',
    templateUrl: './daily-stats-chart.component.html',
    styleUrls: ['./daily-stats-chart.component.scss'],
})
export class DailyStatsChartComponent {

    /** Actual number of days of statistics provided by the backend. */
    countDays = 0;
    /** Total number of views over the returned stats period. */
    countViews?: number;
    /** Total number of comments over the returned stats period. */
    countComments?: number;

    chartDataViews?: ChartConfiguration['data'];
    chartDataComments?: ChartConfiguration['data'];
    chartOptionsViews?: ChartOptions;
    chartOptionsComments?: ChartOptions;

    readonly loadingComments = new ProcessingStatus();
    readonly loadingViews    = new ProcessingStatus();

    private _domainId?: string;
    private _numberOfDays?: number;
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

    private reload() {
        // Undefined domain means it's uninitialised yet
        if (this._domainId === undefined) {
            this.chartDataViews = undefined;
            this.chartDataComments = undefined;
            return;
        }

        // Fetch view counts
        this.api.dashboardDailyStats('views', this._numberOfDays, this._domainId || undefined)
            .pipe(this.loadingViews.processing())
            .subscribe(counts => {
                // Fetch the number of days
                this.countDays = counts.length;

                // Generate data
                this.chartDataViews = this.getChartConfig(counts, $localize`Views`, '#339b11');
                this.chartOptionsViews = this.getChartOptions(this.chartDataViews.labels as string[]);

                // Count totals
                this.countViews = counts!.reduce((acc, n) => acc + n, 0);
            });

        // Fetch comment counts
        this.api.dashboardDailyStats('comments', this._numberOfDays, this._domainId || undefined)
            .pipe(this.loadingComments.processing())
            .subscribe(counts => {
                // Generate data
                this.chartDataComments = this.getChartConfig(counts, $localize`Comments`, '#376daf');
                this.chartOptionsComments = this.getChartOptions(this.chartDataComments.labels as string[]);

                // Count totals
                this.countComments = counts!.reduce((acc, n) => acc + n, 0);
            });
    }

    private getChartConfig(data: number[], label: string, colour: string): ChartConfiguration['data'] {
        return {
            datasets: [{
                label,
                data,
                borderColor:          colour,
                backgroundColor:      `${colour}20`,
                pointBackgroundColor: colour,
                tension:              0.5,
                fill:                 true,
            }],
            labels: this.getDates(data.length),
        };
    }

    private getChartOptions(labels: string[]): ChartOptions {
        return {
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
                    // Only draw one tick per week
                    ticks: {
                        callback: (_, index) => (labels.length - index) % 7 === 1 ? labels[index] : null,
                    },
                },
            },
        };
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
