import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponents } from 'ng-mocks';
import { DomainStatsComponent } from './domain-stats.component';
import { DailyStatsChartComponent } from '../../stats/daily-stats-chart/daily-stats-chart.component';
import { DomainBadgeComponent } from '../../badges/domain-badge/domain-badge.component';
import { mockDomainSelector } from '../../../../_utils/_mocks.spec';
import { PieStatsChartComponent } from '../../stats/pie-stats-chart/pie-stats-chart.component';

describe('DomainStatsComponent', () => {

    let component: DomainStatsComponent;
    let fixture: ComponentFixture<DomainStatsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainStatsComponent, MockComponents(DailyStatsChartComponent, DomainBadgeComponent, PieStatsChartComponent)],
            providers: [
                mockDomainSelector(),
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainStatsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
