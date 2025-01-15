import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponents } from 'ng-mocks';
import { DailyStatsChartComponent } from './daily-stats-chart.component';
import { MetricCardComponent } from '../../dashboard/metric-card/metric-card.component';

describe('DailyStatsChartComponent', () => {

    let component: DailyStatsChartComponent;
    let fixture: ComponentFixture<DailyStatsChartComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [DailyStatsChartComponent, MockComponents(MetricCardComponent)],
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
