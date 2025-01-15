import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { StatsDimensionItem } from '../../../../../generated-api';
import { HashColourPipe } from '../../../tools/_pipes/hash-colour.pipe';

@Component({
    selector: 'app-pie-stats-chart',
    templateUrl: './pie-stats-chart.component.html',
    styleUrls: ['./pie-stats-chart.component.scss'],
    imports: [
        BaseChartDirective,
        DecimalPipe,
    ],
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

    /** Page view statistical data. */
    @Input({required: true})
    set data(items: StatsDimensionItem[] | undefined) {
        if (items) {
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
            this.chartData = {
                datasets: [{
                    data:                 this.values,
                    borderColor:          '#ffffff',
                    backgroundColor:      this.colours,
                    hoverBackgroundColor: this.colours,
                }],
                labels: this.labels,
            };
        } else {
            this.labels    = undefined;
            this.values    = undefined;
            this.colours   = undefined;
            this.chartData = undefined;
        }
    }
}
