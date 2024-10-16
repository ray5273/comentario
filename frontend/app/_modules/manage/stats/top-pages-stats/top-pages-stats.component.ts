import { Component, Input } from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import { ApiGeneralService, PageStatsItem } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Paths } from '../../../../_utils/consts';

@Component({
    selector: 'app-top-pages-stats',
    templateUrl: './top-pages-stats.component.html',
})
export class TopPagesStatsComponent {

    /** Top pages by views. */
    pagesByViews?: PageStatsItem[];

    /** Top pages by comments. */
    pagesByComments?: PageStatsItem[];

    readonly loading = new ProcessingStatus();
    readonly Paths = Paths;

    readonly viewsHeading     = $localize`:metric|:views`;
    readonly commmentsHeading = $localize`:metric|:comments`;

    protected _domainId?: string;
    private _numberOfDays?: number;
    private reload$ = new Subject<void>();

    constructor(
        private readonly api: ApiGeneralService,
    ) {
        // Reload on a property change, with some delay
        this.reload$.pipe(debounceTime(200)).subscribe(() => this.reload());
    }

    /**
     * ID of the domain to collect the statistics for. If an empty string, statistics for all domains of the current
     * user is collected. If undefined, it means no data is available yet.
     */
    @Input({required: true})
    set domainId(id: string | undefined) {
        this._domainId = id;
        this.reload$.next();
    }

    /**
     * Number of days of statistics to request from the backend.
     */
    @Input()
    set numberOfDays(n: number) {
        this._numberOfDays = n;
        this.reload$.next();
    }

    private reload() {
        // Undefined domain means the data is uninitialised yet
        if (this._domainId === undefined) {
            this.pagesByViews    = undefined;
            this.pagesByComments = undefined;
            return;
        }

        // Fetch view/comment counts
        this.api.dashboardPageStats(this._numberOfDays, this._domainId || undefined)
            .pipe(this.loading.processing())
            .subscribe(data => {
                this.pagesByViews    = data.views;
                this.pagesByComments = data.comments;
            });
    }
}
