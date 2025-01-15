import { Component, Input } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageStatsItem } from '../../../../../generated-api';
import { Paths } from '../../../../_utils/consts';

@Component({
    selector: 'app-top-pages-stats',
    templateUrl: './top-pages-stats.component.html',
    imports: [
        NgTemplateOutlet,
        RouterLink,
        DecimalPipe,
    ],
})
export class TopPagesStatsComponent {

    /** Top pages by views. */
    @Input({required: true})
    pagesByViews?: PageStatsItem[];

    /** Top pages by comments. */
    @Input({required: true})
    pagesByComments?: PageStatsItem[];

    /** ID of the domain, if applicable. */
    @Input()
    domainId?: string;

    readonly Paths = Paths;
    readonly viewsHeading    = $localize`:metric|:views`;
    readonly commentsHeading = $localize`:metric|:comments`;
}
