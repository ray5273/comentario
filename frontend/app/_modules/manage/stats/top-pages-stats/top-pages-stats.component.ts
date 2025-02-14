import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageStatsItem } from '../../../../../generated-api';
import { Paths } from '../../../../_utils/consts';

@Component({
    selector: 'app-top-pages-stats',
    templateUrl: './top-pages-stats.component.html',
    imports: [
        RouterLink,
        DecimalPipe,
    ],
})
export class TopPagesStatsComponent {

    /** Top pages items. */
    @Input({required: true})
    items?: PageStatsItem[];

    /** ID of the domain, if applicable. */
    @Input()
    domainId?: string;

    /** Title to display above the list. */
    @Input({required: true})
    title?: string;

    /** Name of the metric, a plural to be appended to the corresponding figure. */
    @Input({required: true})
    metricName?: string;

    readonly Paths = Paths;
}
