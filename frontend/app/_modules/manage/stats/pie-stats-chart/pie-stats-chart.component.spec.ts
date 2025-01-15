import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PieStatsChartComponent } from './pie-stats-chart.component';

describe('PieStatsChartComponent', () => {

    let component: PieStatsChartComponent;
    let fixture: ComponentFixture<PieStatsChartComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [PieStatsChartComponent],
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
