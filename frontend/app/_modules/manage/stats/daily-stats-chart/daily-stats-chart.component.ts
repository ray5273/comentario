import { Component, Inject, Input, LOCALE_ID } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ChartConfiguration, ChartOptions } from 'chart.js';

@Component({
    selector: 'app-daily-stats-chart',
    templateUrl: './daily-stats-chart.component.html',
    styleUrls: ['./daily-stats-chart.component.scss'],
})
export class DailyStatsChartComponent {

    /** Total number of views over the returned stats period. */
    @Input({required: true})
    totalViews?: number;

    /** Total number of comments over the returned stats period. */
    @Input({required: true})
    totalComments?: number;

    // Chart data
    chartDataViews?: ChartConfiguration['data'];
    chartDataComments?: ChartConfiguration['data'];
    chartOptionsViews?: ChartOptions;
    chartOptionsComments?: ChartOptions;

    constructor(
        @Inject(LOCALE_ID) private readonly locale: string,
    ) {}

    /** Daily numbers of views. */
    @Input({required: true})
    set countsViews(c: number[] | undefined) {
        if (c?.length) {
            this.chartDataViews    = this.getChartConfig(c, $localize`Views`, '#339b11') ;
            this.chartOptionsViews = this.getChartOptions(this.chartDataViews.labels as string[]);
        } else {
            this.chartDataViews    = undefined;
            this.chartOptionsViews = undefined;
        }
    }

    /** Daily numbers of comments. */
    @Input({required: true})
    set countsComments(c: number[] | undefined) {
        if (c?.length) {
            this.chartDataComments    = this.getChartConfig(c, $localize`Comments`, '#376daf');
            this.chartOptionsComments = this.getChartOptions(this.chartDataComments.labels as string[]);
        } else {
            this.chartDataComments    = undefined;
            this.chartOptionsComments = undefined;
        }
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
