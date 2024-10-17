import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgChartsModule } from 'ng2-charts';
import { MockComponents } from 'ng-mocks';
import { DailyStatsChartComponent } from './daily-stats-chart.component';
import { ToolsModule } from '../../../tools/tools.module';
import { MetricCardComponent } from '../../dashboard/metric-card/metric-card.component';

describe('DailyStatsChartComponent', () => {

    let component: DailyStatsChartComponent;
    let fixture: ComponentFixture<DailyStatsChartComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DailyStatsChartComponent, MockComponents(MetricCardComponent)],
            imports: [NgChartsModule, ToolsModule],
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
