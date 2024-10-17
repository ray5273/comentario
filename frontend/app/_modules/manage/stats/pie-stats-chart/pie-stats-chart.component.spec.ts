import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgChartsModule } from 'ng2-charts';
import { PieStatsChartComponent } from './pie-stats-chart.component';
import { ToolsModule } from '../../../tools/tools.module';

describe('PieStatsChartComponent', () => {

    let component: PieStatsChartComponent;
    let fixture: ComponentFixture<PieStatsChartComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PieStatsChartComponent],
            imports: [ToolsModule, NgChartsModule],
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
