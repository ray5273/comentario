import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { PieStatsChartComponent } from './pie-stats-chart.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { ToolsModule } from '../../../tools/tools.module';
import { NoDataComponent } from '../../../tools/no-data/no-data.component';

describe('PieStatsChartComponent', () => {

    let component: PieStatsChartComponent;
    let fixture: ComponentFixture<PieStatsChartComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PieStatsChartComponent, MockComponents(NoDataComponent)],
            providers: [
                MockProvider(ApiGeneralService),
            ],
            imports: [ToolsModule],
        })
            .compileComponents();

        fixture = TestBed.createComponent(PieStatsChartComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
