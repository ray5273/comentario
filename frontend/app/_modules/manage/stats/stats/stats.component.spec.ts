import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatsComponent } from './stats.component';
import { MockComponents, MockProvider } from 'ng-mocks';
import { ApiGeneralService } from '../../../../../generated-api';
import { ToolsModule } from '../../../tools/tools.module';
import { DailyStatsChartComponent } from '../daily-stats-chart/daily-stats-chart.component';
import { PieStatsChartComponent } from '../pie-stats-chart/pie-stats-chart.component';
import { TopPagesStatsComponent } from '../top-pages-stats/top-pages-stats.component';

describe('StatsComponent', () => {

    let component: StatsComponent;
    let fixture: ComponentFixture<StatsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                declarations: [
                    StatsComponent,
                    MockComponents(DailyStatsChartComponent, PieStatsChartComponent, TopPagesStatsComponent)],
                providers: [
                    MockProvider(ApiGeneralService),
                ],
                imports: [ToolsModule],
            })
            .compileComponents();

        fixture = TestBed.createComponent(StatsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
