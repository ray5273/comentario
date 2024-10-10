import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DashboardComponent } from './dashboard.component';
import { ApiGeneralService } from '../../../../generated-api';
import { ToolsModule } from '../../tools/tools.module';
import { DailyStatsChartComponent } from '../stats/daily-stats-chart/daily-stats-chart.component';
import { MetricCardComponent } from './metric-card/metric-card.component';
import { mockAuthService } from '../../../_utils/_mocks.spec';
import { PieStatsChartComponent } from '../stats/pie-stats-chart/pie-stats-chart.component';

describe('DashboardComponent', () => {

    let component: DashboardComponent;
    let fixture: ComponentFixture<DashboardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DashboardComponent, MockComponents(MetricCardComponent, DailyStatsChartComponent, PieStatsChartComponent)],
            imports: [ToolsModule],
            providers: [
                MockProvider(
                    ApiGeneralService,
                    {
                        dashboardTotals: () => of({}) as any,
                        dashboardDailyStats: () => of([]) as any,
                    }),
                mockAuthService(),
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
