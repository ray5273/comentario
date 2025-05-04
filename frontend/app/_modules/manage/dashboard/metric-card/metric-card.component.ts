import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
    selector: 'app-metric-card',
    templateUrl: './metric-card.component.html',
    styleUrls: ['./metric-card.component.scss'],
    imports: [
        BaseChartDirective,
        DecimalPipe,
    ],
})
export class MetricCardComponent {

    /** Display label. */
    readonly label = input<string>();

    /** Second-line display label. */
    readonly sublabel = input<string>();

    /** Metric value. */
    readonly value = input<number>();

    /** Whether the card should use the full parent height. */
    readonly fullHeight = input(false);

    /** Colour of the underlying chart. */
    readonly chartColour = input<string | null | undefined>();

    /** Point values to plot on the underlying chart. If omitted or empty, no chart is shown. */
    readonly chartCounts = input<number[] | null | undefined>();

    readonly chartData = computed<ChartData<'bar'> | undefined>(() =>
        this.chartCounts() ?
            {
                datasets: [{
                    data:            this.chartCounts() ?? [],
                    backgroundColor: this.chartColour() || '#48484855',
                }],
                labels: Array(this.chartCounts()?.length).fill('z'),
            } :
            undefined);

    readonly chartOptions: ChartOptions<'bar'> = {
        maintainAspectRatio: false,
        backgroundColor: '#00000000',
        plugins: {
            legend: {display: false},
        },
        scales: {
            x: {display: false},
            y: {display: false},
        }
    };
}
