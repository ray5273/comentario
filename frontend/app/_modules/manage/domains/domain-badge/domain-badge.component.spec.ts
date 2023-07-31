import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { DomainBadgeComponent } from './domain-badge.component';
import { DomainSelectorService } from '../../_services/domain-selector.service';

describe('DomainBadgeComponent', () => {

    let component: DomainBadgeComponent;
    let fixture: ComponentFixture<DomainBadgeComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainBadgeComponent],
            providers: [
                MockProvider(DomainSelectorService),
            ],
        });
        fixture = TestBed.createComponent(DomainBadgeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
