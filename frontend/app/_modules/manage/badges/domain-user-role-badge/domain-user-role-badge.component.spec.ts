import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomainUserRoleBadgeComponent } from './domain-user-role-badge.component';

describe('DomainUserRoleBadgeComponent', () => {

    let component: DomainUserRoleBadgeComponent;
    let fixture: ComponentFixture<DomainUserRoleBadgeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [DomainUserRoleBadgeComponent],
            })
            .compileComponents();
        fixture = TestBed.createComponent(DomainUserRoleBadgeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
