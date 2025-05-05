import { Component, input } from '@angular/core';
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
    readonly items = input<PageStatsItem[]>();

    /** ID of the domain, if applicable. */
    readonly domainId = input<string>();

    /** Title to display above the list. */
    readonly title = input<string>();

    /** Name of the metric, a plural to be appended to the corresponding figure. */
    readonly metricName = input<string>();

    readonly Paths = Paths;
}
