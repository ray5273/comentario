import { Component, computed, Inject, input, LOCALE_ID } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { MetricCardComponent } from '../../dashboard/metric-card/metric-card.component';
import { NoDataComponent } from '../../../tools/no-data/no-data.component';

@Component({
    selector: 'app-daily-stats-chart',
    templateUrl: './daily-stats-chart.component.html',
    styleUrls: ['./daily-stats-chart.component.scss'],
    imports: [
        MetricCardComponent,
        BaseChartDirective,
        NoDataComponent,
    ],
})
export class DailyStatsChartComponent {

    /** Total number of views over the returned stats period. */
    readonly totalViews = input<number>();

    /** Total number of comments over the returned stats period. */
    readonly totalComments = input<number>();

    /** Daily numbers of views. */
    readonly countsViews = input<number[] | undefined>();

    /** Daily numbers of comments. */
    readonly countsComments = input<number[] | undefined>();

    readonly chartDataViews       = computed<ChartConfiguration['data'] | undefined>(() => this.getChartConfig(this.countsViews(), $localize`Views`, '#339b11'));
    readonly chartDataComments    = computed<ChartConfiguration['data'] | undefined>(() => this.getChartConfig(this.countsComments(), $localize`Comments`, '#376daf'));
    readonly chartOptionsViews    = computed<ChartOptions | undefined>(() => this.getChartOptions(this.chartDataViews()?.labels as any));
    readonly chartOptionsComments = computed<ChartOptions | undefined>(() => this.getChartOptions(this.chartDataComments()?.labels as any));

    constructor(
        @Inject(LOCALE_ID) private readonly locale: string,
    ) {}

    private getChartConfig(data: number[] | undefined, label: string, colour: string): ChartConfiguration['data'] | undefined {
        return data ?
            {
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
            } :
            undefined;
    }

    private getChartOptions(labels: string[] | undefined): ChartOptions | undefined {
        return labels ?
            {
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
            } :
            undefined;
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
