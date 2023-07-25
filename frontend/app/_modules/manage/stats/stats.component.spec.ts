import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockComponents, MockProvider } from 'ng-mocks';
import { StatsComponent } from './stats.component';
import { StatsChartComponent } from '../stats-chart/stats-chart.component';
import { DomainMeta, DomainSelectorService } from '../_services/domain-selector.service';
import { DomainBadgeComponent } from '../domain-badge/domain-badge.component';

describe('StatsComponent', () => {

    let component: StatsComponent;
    let fixture: ComponentFixture<StatsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [StatsComponent, MockComponents(StatsChartComponent, DomainBadgeComponent)],
            providers: [
                MockProvider(DomainSelectorService, {domainMeta: of(new DomainMeta())}),
            ],
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
