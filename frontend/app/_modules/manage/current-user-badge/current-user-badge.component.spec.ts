import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CurrentUserBadgeComponent } from './current-user-badge.component';

describe('CurrentUserBadgeComponent', () => {

    let component: CurrentUserBadgeComponent;
    let fixture: ComponentFixture<CurrentUserBadgeComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [CurrentUserBadgeComponent],
        });
        fixture = TestBed.createComponent(CurrentUserBadgeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
