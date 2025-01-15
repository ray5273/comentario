import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomainUserBadgeComponent } from './domain-user-badge.component';

describe('DomainUserBadgeComponent', () => {

    let component: DomainUserBadgeComponent;
    let fixture: ComponentFixture<DomainUserBadgeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [DomainUserBadgeComponent],
            })
            .compileComponents();
        fixture = TestBed.createComponent(DomainUserBadgeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
