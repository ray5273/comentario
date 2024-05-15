import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomainBadgeComponent } from './domain-badge.component';
import { mockDomainSelector } from '../../../../_utils/_mocks.spec';

describe('DomainBadgeComponent', () => {

    let component: DomainBadgeComponent;
    let fixture: ComponentFixture<DomainBadgeComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainBadgeComponent],
            providers: [
                mockDomainSelector(),
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
