import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomainBadgeComponent } from './domain-badge.component';
import { mockDomainSelector } from '../../../../_utils/_mocks.spec';

describe('DomainBadgeComponent', () => {

    let component: DomainBadgeComponent;
    let fixture: ComponentFixture<DomainBadgeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [DomainBadgeComponent],
                providers: [
                    mockDomainSelector(),
                ],
            })
            .compileComponents();
        fixture = TestBed.createComponent(DomainBadgeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
