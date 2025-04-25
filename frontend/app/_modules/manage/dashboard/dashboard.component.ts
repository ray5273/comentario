import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { concatMap, first, tap } from 'rxjs';
import { UntilDestroy } from '@ngneat/until-destroy';
import { ApiGeneralService, StatsTotals } from '../../../../generated-api';
import { ProcessingStatus } from '../../../_utils/processing-status';
import { MetricCardComponent } from './metric-card/metric-card.component';
import { StatsComponent } from '../stats/stats/stats.component';
import { LoaderDirective } from '../../tools/_directives/loader.directive';
import { ConfigService } from '../../../_services/config.service';
import { InstanceConfigItemKey } from '../../../_models/config';
import { Paths } from '../../../_utils/consts';
import { PrincipalService } from '../../../_services/principal.service';

@UntilDestroy()
@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    imports: [
        MetricCardComponent,
        StatsComponent,
        LoaderDirective,
        RouterLink,
    ],
})
export class DashboardComponent implements OnInit {

    /** Currently authenticated principal. */
    readonly principal = this.principalSvc.principal;

    /** User's total figures, displayed as metric cards. */
    totals?: StatsTotals;

    /** Daily page counts, displayed on the background of the "Pages you moderate" card. */
    domainPageCounts?: number[];

    /** Daily page counts, displayed on the background of the "Domain users you managed" card. */
    domainUserCounts?: number[];

    /** Whether the current user has any role on any domain. `undefined` until becomes known. */
    hasData?: boolean;

    /** Whether the current user is able to register a new domain. `undefined` until becomes known. */
    canAddDomain?: boolean;

    readonly Paths = Paths;
    readonly loading = new ProcessingStatus();

    constructor(
        private readonly api: ApiGeneralService,
        private readonly configSvc: ConfigService,
        private readonly principalSvc: PrincipalService,
    ) {}

    ngOnInit(): void {
        // Fetch dynamic config
        this.configSvc.dynamicConfig
            .pipe(first())
            .subscribe(dc => this.canAddDomain = !!dc.get(InstanceConfigItemKey.operationNewOwnerEnabled).val);

        // Fetch the totals from the backend. Serialise data fetching to unburden the backend
        this.api.dashboardTotals()
            .pipe(
                this.loading.processing(),
                concatMap(t => {
                    this.totals = t;
                    this.hasData = t.countDomainsOwned + t.countDomainsModerated + t.countDomainsCommenter + t.countDomainsReadonly > 0;

                    // Fetch domain page stats
                    return this.api.dashboardDailyStats('domainPages');
                }),
                concatMap(p => {
                    this.domainPageCounts = p;
                    // Fetch domain user stats
                    return this.api.dashboardDailyStats('domainUsers');
                }),
                tap(u => this.domainUserCounts = u),
            )
            .subscribe();
    }
}
