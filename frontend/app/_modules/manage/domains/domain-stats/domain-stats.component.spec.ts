import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainStatsComponent } from './domain-stats.component';
import { StatsChartComponent } from '../../stats-chart/stats-chart.component';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';
import { DomainBadgeComponent } from '../domain-badge/domain-badge.component';

describe('DomainStatsComponent', () => {

    let component: DomainStatsComponent;
    let fixture: ComponentFixture<DomainStatsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainStatsComponent, MockComponents(StatsChartComponent, DomainBadgeComponent)],
            providers: [
                MockProvider(DomainSelectorService, {domainMeta: of(new DomainMeta())}),
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
