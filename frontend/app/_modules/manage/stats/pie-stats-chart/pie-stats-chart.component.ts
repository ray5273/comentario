import { Component, computed, input } from '@angular/core';
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

    /** Chart data to display. */
    readonly data = input<StatsDimensionItem[]>();

    /** Item data points. */
    readonly values = computed<number[] | undefined>(() => {
        const data = this.data();
        if (!data) {
            return undefined;
        }

        // Limit the number of segments to MaxItems
        const r = data.slice(0, PieStatsChartComponent.MaxItems).map(item => item.count);

        // Roll up counts beyond MaxItems
        if (data.length > PieStatsChartComponent.MaxItems) {
            r.push(data.slice(PieStatsChartComponent.MaxItems).reduce((acc, item) => acc + item.count, 0));
        }
        return r;
    });

    /** Item labels. */
    readonly labels = computed<string[] | undefined>(() => {
        const data = this.data();
        if (!data) {
            return undefined;
        }

        // Limit the number of segments to MaxItems
        const r = data.slice(0, PieStatsChartComponent.MaxItems).map(item => item.element);

        // Roll up counts beyond MaxItems
        if (data.length > PieStatsChartComponent.MaxItems) {
            r.push($localize`Others`);
        }
        return r;
    });

    /** Item colours. */
    readonly colours = computed<string[] | undefined>(() => {
        // Hash labels to determine each label's colour; use the DefaultColour for the optional (last) roll-up item
        const pipe = new HashColourPipe();
        return this.labels()
            ?.map((s, i) => i >= PieStatsChartComponent.MaxItems ? HashColourPipe.DefaultColour : pipe.transform(s));
    });

    /** Ready-to-display chart data. */
    readonly chartData = computed<ChartConfiguration['data'] | undefined>(() =>
        this.values() ?
        {
            datasets: [{
                data:                 this.values()!,
                borderColor:          '#ffffff',
                backgroundColor:      this.colours(),
                hoverBackgroundColor: this.colours(),
            }],
            labels: this.labels(),
        } :
        undefined);

    /** (Constant) chart options. */
    readonly chartOptions: ChartOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            }
        }
    };
}
