import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { StatsChartComponent } from './stats-chart.component';
import { ApiGeneralService } from '../../../../generated-api';
import { ToolsModule } from '../../tools/tools.module';
import { NoDataComponent } from '../../tools/no-data/no-data.component';
import { MetricCardComponent } from '../dashboard/metric-card/metric-card.component';

describe('StatsChartComponent', () => {

    let component: StatsChartComponent;
    let fixture: ComponentFixture<StatsChartComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [StatsChartComponent, MockComponents(NoDataComponent, MetricCardComponent)],
            providers: [
                MockProvider(ApiGeneralService),
            ],
            imports: [ToolsModule],
        })
            .compileComponents();

        fixture = TestBed.createComponent(StatsChartComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
