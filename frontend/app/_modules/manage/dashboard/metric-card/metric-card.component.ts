import { Component, Input } from '@angular/core';

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
}
