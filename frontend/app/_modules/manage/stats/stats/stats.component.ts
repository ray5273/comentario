import { Component, Input } from '@angular/core';
import { concatMap, debounceTime, of, Subject, tap } from 'rxjs';
import { ApiGeneralService, PageStatsItem, StatsDimensionItem } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';

@Component({
    selector: 'app-stats',
    templateUrl: './stats.component.html',
})
export class StatsComponent {

    // Daily stats data
    dailyCountsViews?: number[];
    dailyCountsComments?: number[];
    totalCountViews?: number;
    totalCountComments?: number;
    readonly loadingDaily = new ProcessingStatus();

    // Page views data
    pageViewsStats?: {
        countries?: StatsDimensionItem[],
        devices?:   StatsDimensionItem[],
        browsers?:  StatsDimensionItem[],
        oses?:      StatsDimensionItem[],
    };
    readonly loadingPageViews = new ProcessingStatus();

    // Top pages data
    topPagesByViews?: PageStatsItem[];
    topPagesByComments?: PageStatsItem[];
    readonly loadingTopPages = new ProcessingStatus();

    _domainId?: string;
    private _numberOfDays?: number;
    private reload$ = new Subject<void>();

    /**
     * ID of the domain to collect the statistics for. If an empty string, statistics for all domains of the current
     * user is collected.
     */
    @Input()
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

    constructor(
        private readonly api: ApiGeneralService,
    ) {
        // Reload on a property change, with some delay
        this.reload$.pipe(debounceTime(200)).subscribe(() => this.reload());
    }

    /**
     * (Re)load all statistical data
     * @private
     */
    private reload() {
        // Undefined domain means it's uninitialised yet
        if (this._domainId === undefined) {
            // Remove daily data
            this.dailyCountsViews    = undefined;
            this.dailyCountsComments = undefined;
            this.totalCountViews     = undefined;
            this.totalCountComments  = undefined;
            // Remove page views data
            this.pageViewsStats = undefined;
            // Remove top pages data
            this.topPagesByViews    = undefined;
            this.topPagesByComments = undefined;
            return;
        }

        // Fetch the data: serialise requests to the API to unburden the backend

        // Fetch daily view counts
        const domainId = this._domainId || undefined;
        this.api.dashboardDailyStats('views', this._numberOfDays, domainId)
            .pipe(
                // Save daily view counts and calculate a total number of views
                tap(counts => {
                    this.dailyCountsViews = counts;
                    this.totalCountViews = counts!.reduce((acc, n) => acc + n, 0);
                }),

                // Fetch daily comment counts
                concatMap(() => this.api.dashboardDailyStats('comments', this._numberOfDays, this._domainId || undefined)),
                tap(counts => {
                    this.dailyCountsComments = counts;
                    this.totalCountComments = counts!.reduce((acc, n) => acc + n, 0);
                }),

                // Loading indicator
                this.loadingDaily.processing())
            .subscribe(() => {
                // Fetch page view statistics, if there are any views
                this.pageViewsStats = {};
                if (this.totalCountViews) {
                    // Countries
                    this.api.dashboardPageViewStats('country', this._numberOfDays, domainId)
                        .pipe(
                            tap(d => this.pageViewsStats!.countries = d),

                            // Devices
                            concatMap(() => this.totalCountViews ?
                                this.api.dashboardPageViewStats('device', this._numberOfDays, domainId) :
                                of(undefined)),
                            tap(d => this.pageViewsStats!.devices = d),

                            // Browsers
                            concatMap(() => this.totalCountViews ?
                                this.api.dashboardPageViewStats('browser', this._numberOfDays, domainId) :
                                of(undefined)),
                            tap(d => this.pageViewsStats!.browsers = d),

                            // OSes
                            concatMap(() => this.totalCountViews ?
                                this.api.dashboardPageViewStats('os', this._numberOfDays, domainId) :
                                of(undefined)),
                            tap(d => this.pageViewsStats!.oses = d),

                            // Loading indicator
                            this.loadingPageViews.processing())
                        .subscribe();
                }

                // Fetch top performing pages, if there any
                if (this.totalCountViews || this.totalCountComments) {
                    this.api.dashboardPageStats(this._numberOfDays, domainId)
                        // Loading indicator
                        .pipe(this.loadingTopPages.processing())
                        .subscribe(data => {
                            this.topPagesByViews    = data.views;
                            this.topPagesByComments = data.comments;
                        });
                } else {
                    this.topPagesByViews    = undefined;
                    this.topPagesByComments = undefined;
                }
            });
    }
}
