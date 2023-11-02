import { Component, Input } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';

@Component({
    selector: 'app-metric-card',
    templateUrl: './metric-card.component.html',
    styleUrls: ['./metric-card.component.scss'],
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

    chartData?: ChartConfiguration['data'];

    private _chartClr: string | null | undefined;

    readonly chartOptions: ChartOptions = {
        maintainAspectRatio: false,
        backgroundColor: '#00000000',
        plugins: {
            legend: {display: false},
        },
        scales: {
            x: {
                display: false,
                grid: {display: false},
                ticks: {display: false},
            },
            y: {
                display: false,
                grid: {display: false},
                ticks: {display: false},
            },
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
            this.chartData.datasets[0].borderColor = c || '#fd4f8850';
        }
    }

    /**
     * Point values to plot on the underlying chart. If omitted or empty, no chart is shown.
     */
    @Input()
    set chartCounts(c: number[] | null | undefined) {
        this.chartData = {
            datasets: [{
                data:        c ?? [],
                borderColor: this._chartClr || '#fd4f8850',
                pointStyle: false,
            }],
            labels: Array(c?.length).fill(''),
        };
    }
}
