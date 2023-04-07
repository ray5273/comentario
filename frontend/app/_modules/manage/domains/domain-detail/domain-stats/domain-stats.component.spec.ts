import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockProvider, MockService } from 'ng-mocks';
import { DomainStatsComponent } from './domain-stats.component';
import { ApiOwnerService } from '../../../../../../generated-api';
import { ToolsModule } from '../../../../tools/tools.module';
import { DomainDetailComponent } from '../domain-detail.component';

describe('DomainStatsComponent', () => {

    let component: DomainStatsComponent;
    let fixture: ComponentFixture<DomainStatsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainStatsComponent],
            imports: [ToolsModule],
            providers: [
                {provide: ApiOwnerService, useValue: MockService(ApiOwnerService)},
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
