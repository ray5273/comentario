import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DashboardComponent } from './dashboard.component';
import { ApiGeneralService } from '../../../../generated-api';
import { MetricCardComponent } from './metric-card/metric-card.component';
import { mockConfigService } from '../../../_utils/_mocks.spec';
import { StatsComponent } from '../stats/stats/stats.component';
import { PrincipalService } from '../../../_services/principal.service';

describe('DashboardComponent', () => {

    let component: DashboardComponent;
    let fixture: ComponentFixture<DashboardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    DashboardComponent,
                    MockComponents(MetricCardComponent, StatsComponent),
                ],
                providers: [
                    MockProvider(ApiGeneralService, {
                        dashboardTotals:     () => of({}) as any,
                        dashboardDailyStats: () => of([]) as any,
                    }),
                    MockProvider(PrincipalService, {principal: signal(undefined)}),
                    mockConfigService(),
                ],
            })
            .compileComponents();

        fixture = TestBed.createComponent(DashboardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
