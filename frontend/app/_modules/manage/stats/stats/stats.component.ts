import { Component, effect, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { concatMap, Observable, of, tap, toArray } from 'rxjs';
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

    /** ID of the domain to collect the statistics for. If '', statistics for all domains of the current user is collected. */
    readonly domainId = input<string | undefined>();

    /** Number of days of statistics to request from the backend. */
    readonly numberOfDays = input<number>();

    // Daily stats data
    totalCounts?: Partial<Record<DailyMetric, number>>;
    dailyStats?:  Partial<Record<DailyMetric, number[]>>;
    readonly loadingDaily = new ProcessingStatus();

    // Page views data
    pageViewsStats?: Partial<Record<PageViewDimension, StatsDimensionItem[]>>;
    readonly loadingPageViews: Record<PageViewDimension, ProcessingStatus> = {
        country: new ProcessingStatus(true),
        device:  new ProcessingStatus(true),
        browser: new ProcessingStatus(true),
        os:      new ProcessingStatus(true),
    };

    // Top pages data
    topPagesByViews?: PageStatsItem[];
    topPagesByComments?: PageStatsItem[];
    readonly loadingTopPages = new ProcessingStatus();

    constructor(
        private readonly api: ApiGeneralService,
    ) {
        // Initially load the stats, and reload on a property change
        effect(() => this.reload());
    }

    /**
     * (Re)load all statistical data.
     * @private
     */
    private reload() {
        // Undefined domain means it isn't initialised yet
        const domainId = this.domainId();
        if (domainId === undefined) {
            this.totalCounts        = undefined;
            this.dailyStats         = undefined;
            this.pageViewsStats     = undefined;
            this.topPagesByViews    = undefined;
            this.topPagesByComments = undefined;
            return;
        }

        // First, load daily figures and calculate totals to determine if there's any other stats worth fetching
        // (translate empty string (= all domains) into undefined)
        this.loadDaily(domainId || undefined)
            // Second, load page views and top pages in parallel
            .subscribe(() => {
                this.loadPageViews(domainId);
                this.loadTopPages(domainId);
            });
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
                    this.api.dashboardDailyStats(metric, this.numberOfDays(), domainId)
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
    private loadPageViews(domainId: string | undefined) {
        // Don't bother if no views at all
        if (!this.totalCounts?.views) {
            this.pageViewsStats = undefined;
            return;
        }

        // Iterate dimensions and load stats for each of them sequentially, to unburden the backend
        this.pageViewsStats = {};
        of<PageViewDimension[]>('country', 'device', 'browser', 'os')
            .pipe(
                concatMap(dim =>
                    this.api.dashboardPageViewStats(dim, this.numberOfDays(), domainId)
                        .pipe(
                            this.loadingPageViews[dim].processing(),
                            tap(d => this.pageViewsStats![dim] = d))))
            .subscribe();
    }

    /**
     * (Re)load the top pages statistics, optionally restricting the result to the given domain.
     * @param domainId ID of the domain to load stats for. If undefined, statistics for all domains is requested.
     * @private
     */
    private loadTopPages(domainId: string | undefined) {
        // Don't bother if no views and no comments
        if (!this.totalCounts?.views && !this.totalCounts?.comments) {
            this.topPagesByViews    = undefined;
            this.topPagesByComments = undefined;
            return;
        }

        // Load the top page stats
        this.api.dashboardPageStats(this.numberOfDays(), domainId)
            .pipe(this.loadingTopPages.processing())
            .subscribe(r => {
                this.topPagesByViews    = r.views;
                this.topPagesByComments = r.comments;
            });
    }
}
