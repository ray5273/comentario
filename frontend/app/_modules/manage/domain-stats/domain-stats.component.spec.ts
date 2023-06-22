import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockComponent, MockProvider } from 'ng-mocks';
import { DomainStatsComponent } from './domain-stats.component';
import { DomainDetailComponent } from '../domain-detail.component';
import { StatsChartComponent } from '../stats-chart/stats-chart.component';

describe('DomainStatsComponent', () => {

    let component: DomainStatsComponent;
    let fixture: ComponentFixture<DomainStatsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainStatsComponent, MockComponent(StatsChartComponent)],
            providers: [
                MockProvider(DomainDetailComponent, {domain: of(undefined)} as any),
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
