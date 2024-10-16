import { Component, Input } from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { ApiGeneralService, StatsDimensionItem } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { HashColourPipe } from '../../../tools/_pipes/hash-colour.pipe';

@Component({
    selector: 'app-pie-stats-chart',
    templateUrl: './pie-stats-chart.component.html',
    styleUrls: ['./pie-stats-chart.component.scss'],
})
export class PieStatsChartComponent {

    /** Number of top items to display. */
    static readonly MaxItems = 5;

    chartData?: ChartConfiguration['data'];
    chartOptions: ChartOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            }
        }
    };

    /** Item data points. */
    values?: number[];

    /** Item labels. */
    labels?: string[];

    /** Item colours. */
    colours?: string[];

    readonly loading = new ProcessingStatus();

    private _dimension?: 'proto' | 'country' | 'browser' | 'os' | 'device';
    private _domainId?: string;
    private _numberOfDays?: number;
    private reload$ = new Subject<void>();

    constructor(
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
     * user is collected. If undefined, it means no data is available yet.
     */
    @Input({required: true})
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
        // Limit the number of segments to MaxItems
        this.labels = items.slice(0, PieStatsChartComponent.MaxItems).map(item => item.element);
        this.values = items.splice(0, PieStatsChartComponent.MaxItems).map(item => item.count);

        // Calculate segment colours based on label hash
        const pipe = new HashColourPipe();
        this.colours = this.labels.map(s => pipe.transform(s));

        // Roll up counts beyond MaxItems
        if (items.length) {
            this.labels.push($localize`Others`);
            this.values.push(items.reduce((acc, item) => acc + item.count, 0));
            this.colours.push(HashColourPipe.DefaultColour);
        }

        // Make up a configuration object
        return {
            datasets: [{
                data:                 this.values,
                borderColor:          '#ffffff',
                backgroundColor:      this.colours,
                hoverBackgroundColor: this.colours,
            }],
            labels: this.labels,
        };
    }
}
