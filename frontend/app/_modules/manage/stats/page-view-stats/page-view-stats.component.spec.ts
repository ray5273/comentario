import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponents } from 'ng-mocks';
import { PageViewStatsComponent } from './page-view-stats.component';
import { PieStatsChartComponent } from '../pie-stats-chart/pie-stats-chart.component';

describe('PageViewStatsComponent', () => {

    let component: PageViewStatsComponent;
    let fixture: ComponentFixture<PageViewStatsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                declarations: [PageViewStatsComponent, MockComponents(PieStatsChartComponent)],
            })
            .compileComponents();

        fixture = TestBed.createComponent(PageViewStatsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
