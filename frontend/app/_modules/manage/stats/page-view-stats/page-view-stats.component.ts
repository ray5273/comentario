import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-page-view-stats',
    templateUrl: './page-view-stats.component.html',
})
export class PageViewStatsComponent {

    /**
     * ID of the domain to collect the statistics for. If an empty string, statistics for all domains of the current
     * user is collected. If undefined, it means no data is available yet.
     */
    @Input({required: true})
    domainId?: string;
}
