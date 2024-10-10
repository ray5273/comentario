import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DailyStatsChartComponent } from './daily-stats-chart.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { ToolsModule } from '../../../tools/tools.module';
import { NoDataComponent } from '../../../tools/no-data/no-data.component';
import { MetricCardComponent } from '../../dashboard/metric-card/metric-card.component';

describe('DailyStatsChartComponent', () => {

    let component: DailyStatsChartComponent;
    let fixture: ComponentFixture<DailyStatsChartComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DailyStatsChartComponent, MockComponents(NoDataComponent, MetricCardComponent)],
            providers: [
                MockProvider(ApiGeneralService),
            ],
            imports: [ToolsModule],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DailyStatsChartComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
