import {ComponentFixture, TestBed} from '@angular/core/testing';
import {DomainUserBadgeComponent} from './domain-user-badge.component';

describe('DomainUserBadgeComponent', () => {

    let component: DomainUserBadgeComponent;
    let fixture: ComponentFixture<DomainUserBadgeComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainUserBadgeComponent]
        });
        fixture = TestBed.createComponent(DomainUserBadgeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
