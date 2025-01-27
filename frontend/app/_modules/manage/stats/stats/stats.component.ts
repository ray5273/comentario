import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { concatMap, debounceTime, EMPTY, forkJoin, mergeMap, Observable, of, Subject, switchMap, tap, toArray } from 'rxjs';
import { ApiGeneralService, PageStatsItem, StatsDimensionItem } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { SpinnerDirective } from '../../../tools/_directives/spinner.directive';
import { DailyStatsChartComponent } from '../daily-stats-chart/daily-stats-chart.component';
import { NoDataComponent } from '../../../tools/no-data/no-data.component';
import { PieStatsChartComponent } from '../pie-stats-chart/pie-stats-chart.component';
import { TopPagesStatsComponent } from '../top-pages-stats/top-pages-stats.component';
import { LoaderDirective } from '../../../tools/_directives/loader.directive';

type DailyMetric = 'views' | 'comments';
type PageViewDimension = 'country' | 'device' | 'browser' | 'os';

@Component({
    selector: 'app-stats',
    templateUrl: './stats.component.html',
    imports: [
        DecimalPipe,
        SpinnerDirective,
        DailyStatsChartComponent,
        NoDataComponent,
        PieStatsChartComponent,
        TopPagesStatsComponent,
        LoaderDirective,
    ],
})
export class StatsComponent {

    // Daily stats data
    totalCounts?: Partial<Record<DailyMetric, number>>;
    dailyStats?:  Partial<Record<DailyMetric, number[]>>;
    readonly loadingDaily = new ProcessingStatus();

    // Page views data
    pageViewsStats?: Partial<Record<PageViewDimension, StatsDimensionItem[]>>;
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
        this.reload$.pipe(debounceTime(200), switchMap(() => this.reload())).subscribe();
    }

    /**
     * (Re)load all statistical data.
     * @private
     */
    private reload(): Observable<any> {
        // Undefined domain means it isn't initialised yet
        if (this._domainId === undefined) {
            this.totalCounts        = undefined;
            this.dailyStats         = undefined;
            this.pageViewsStats     = undefined;
            this.topPagesByViews    = undefined;
            this.topPagesByComments = undefined;
            return EMPTY;
        }

        // First, load daily figures and calculate totals to determine if there's any other stats worth fetching
        const domainId = this._domainId || undefined;
        return this.loadDaily(domainId)
            // Second, load page views and top pages in parallel
            .pipe(mergeMap(() => forkJoin([this.loadPageViews(domainId), this.loadTopPages(domainId)])));
    }

    /**
     * (Re)load the daily view/comment statistics and calculate the related total counts, optionally restricting the
     * result to the given domain.
     * @param domainId ID of the domain to load stats for. If undefined, statistics for all domains is requested.
     * @private
     */
    private loadDaily(domainId: string | undefined): Observable<any> {
        this.dailyStats  = {};
        this.totalCounts = {};

        // Load stats for views and comments sequentially, to unburden the backend
        return of<DailyMetric[]>('views', 'comments')
            .pipe(
                concatMap(metric =>
                    this.api.dashboardDailyStats(metric, this._numberOfDays, domainId)
                        .pipe(
                            tap(counts => {
                                this.totalCounts![metric] = counts.reduce((acc, n) => acc + n, 0);
                                this.dailyStats! [metric] = counts;
                            }))),

                // Loading indicator
                this.loadingDaily.processing(),

                // Emit once on completion
                toArray());
    }

    /**
     * (Re)load the page view statistics, optionally restricting the result to the given domain.
     * @param domainId ID of the domain to load stats for. If undefined, statistics for all domains is requested.
     * @private
     */
    private loadPageViews(domainId: string | undefined): Observable<any> {
        // Don't bother if no views at all
        if (!this.totalCounts?.views) {
            this.pageViewsStats = undefined;
            return EMPTY;
        }

        // Iterate dimensions and load stats for each of them sequentially, to unburden the backend
        this.pageViewsStats = {};
        return of<PageViewDimension[]>('country', 'device', 'browser', 'os')
            .pipe(
                concatMap(dim =>
                    this.api.dashboardPageViewStats(dim, this._numberOfDays, domainId)
                        .pipe(tap(d => this.pageViewsStats![dim] = d))),

                // Loading indicator
                this.loadingPageViews.processing());
    }

    /**
     * (Re)load the top pages statistics, optionally restricting the result to the given domain.
     * @param domainId ID of the domain to load stats for. If undefined, statistics for all domains is requested.
     * @private
     */
    private loadTopPages(domainId: string | undefined): Observable<any> {
        // Don't bother if no views and no comments
        if (!this.totalCounts?.views && !this.totalCounts?.comments) {
            this.topPagesByViews    = undefined;
            this.topPagesByComments = undefined;
            return EMPTY;
        }

        // Load the top page stats
        return this.api.dashboardPageStats(this._numberOfDays, domainId)
            .pipe(
                tap(data => {
                    this.topPagesByViews    = data.views;
                    this.topPagesByComments = data.comments;
                }),

                // Loading indicator
                this.loadingTopPages.processing());
    }
}
