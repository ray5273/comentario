import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockComponent, MockService } from 'ng-mocks';
import { DashboardComponent } from './dashboard.component';
import { ApiGeneralService } from '../../../../generated-api';
import { ToolsModule } from '../../tools/tools.module';
import { StatsChartComponent } from '../stats-chart/stats-chart.component';

describe('DashboardComponent', () => {

    let component: DashboardComponent;
    let fixture: ComponentFixture<DashboardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DashboardComponent, MockComponent(StatsChartComponent)],
            imports: [ToolsModule],
            providers: [
                {provide: ApiGeneralService, useValue: MockService(ApiGeneralService, {dashboardTotals: () => of({}) as any})},
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
