import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { StatsChartComponent } from './stats-chart.component';
import { ApiGeneralService } from '../../../../generated-api';
import { ToolsModule } from '../../tools/tools.module';

describe('StatsChartComponent', () => {

    let component: StatsChartComponent;
    let fixture: ComponentFixture<StatsChartComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [StatsChartComponent],
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
