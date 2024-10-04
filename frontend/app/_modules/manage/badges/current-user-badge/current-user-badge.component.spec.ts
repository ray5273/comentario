import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CurrentUserBadgeComponent } from './current-user-badge.component';
import { mockAuthService } from '../../../../_utils/_mocks.spec';

describe('CurrentUserBadgeComponent', () => {

    let component: CurrentUserBadgeComponent;
    let fixture: ComponentFixture<CurrentUserBadgeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CurrentUserBadgeComponent],
            providers: [
                mockAuthService(),
            ],
        })
            .compileComponents();
        fixture = TestBed.createComponent(CurrentUserBadgeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
