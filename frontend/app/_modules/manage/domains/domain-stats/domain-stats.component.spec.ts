import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponents } from 'ng-mocks';
import { DomainStatsComponent } from './domain-stats.component';
import { StatsChartComponent } from '../../stats-chart/stats-chart.component';
import { DomainBadgeComponent } from '../domain-badge/domain-badge.component';
import { mockDomainSelector } from '../../../../_utils/_mocks.spec';

describe('DomainStatsComponent', () => {

    let component: DomainStatsComponent;
    let fixture: ComponentFixture<DomainStatsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainStatsComponent, MockComponents(StatsChartComponent, DomainBadgeComponent)],
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
