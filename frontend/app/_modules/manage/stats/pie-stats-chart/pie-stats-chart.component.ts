import { Component, Inject, Input, LOCALE_ID } from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { ApiGeneralService, StatsDimensionItem } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';

@Component({
    selector: 'app-pie-stats-chart',
    templateUrl: './pie-stats-chart.component.html',
    styleUrls: ['./pie-stats-chart.component.scss'],
})
export class PieStatsChartComponent {

    /** Chart colours used for pie segments. */
    static readonly ChartColours = [
        '#83adec', '#f35f90', '#55bfa8', '#90c73e',
        '#cd8777', '#c0c0c0',
    ];

    /** Number of top items to display. */
    static readonly MaxItems = 5;

    chartData?: ChartConfiguration['data'];
    chartOptions: ChartOptions = {
        maintainAspectRatio: false,
    };

    readonly loading = new ProcessingStatus();

    private _dimension?: 'proto' | 'country' | 'browser' | 'os' | 'device';
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
     * Dimension to load stats for.
     */
    @Input({required: true})
    set dimension(v: typeof this._dimension) {
        this._dimension = v;
        this.reload$.next();
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
        // Undefined dimension or domain means the data is uninitialised yet
        if (!this._dimension || this._domainId === undefined) {
            this.chartData = undefined;
            return;
        }

        // Fetch view counts
        this.api.dashboardPageViewStats(this._dimension, this._numberOfDays, this._domainId || undefined)
            .pipe(this.loading.processing())
            .subscribe(data => this.chartData = this.getChartData(data));
    }

    private getChartData(items: StatsDimensionItem[]): ChartConfiguration['data'] {
        // Roll up counts beyond MaxItems
        const labels = items.slice(0, PieStatsChartComponent.MaxItems).map(item => item.element);
        const data = items.splice(0, PieStatsChartComponent.MaxItems).map(item => item.count);
        if (items.length) {
            labels.push($localize`Others`);
            data.push(items.reduce((acc, item) => acc + item.count, 0));
        }

        return {
            datasets: [{
                data,
                borderColor:          '#ffffff',
                backgroundColor:      PieStatsChartComponent.ChartColours,
                hoverBackgroundColor: PieStatsChartComponent.ChartColours,
            }],
            labels,
        };
    }
}
