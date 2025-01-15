import { Component, Input } from '@angular/core';
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

    /**
     * Display label.
     */
    @Input({required: true})
    label?: string;

    /**
     * Second-line display label.
     */
    @Input()
    sublabel?: string;

    /**
     * Metric value.
     */
    @Input({required: true})
    value?: number;

    /**
     * Whether the card should use the full parent height.
     */
    @Input()
    fullHeight = false;

    chartData?: ChartData<'bar'>;

    private _chartClr: string | null | undefined;

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

    /**
     * Colour of the underlying chart.
     */
    @Input()
    set chartColour(c: string | null | undefined) {
        this._chartClr = c;

        // Also update the existing chart data, if any
        if (this.chartData) {
            this.chartData.datasets[0].backgroundColor = this.barColour;
        }
    }

    /**
     * Point values to plot on the underlying chart. If omitted or empty, no chart is shown.
     */
    @Input()
    set chartCounts(c: number[] | null | undefined) {
        this.chartData = {
            datasets: [{
                data:            c ?? [],
                backgroundColor: this.barColour,
            }],
            labels: Array(c?.length).fill('z'),
        };
    }

    get barColour(): string {
        return this._chartClr || '#48484855';
    }
}
