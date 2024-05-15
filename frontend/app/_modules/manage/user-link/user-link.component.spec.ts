import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponents } from 'ng-mocks';
import { UserLinkComponent } from './user-link.component';
import { UserAvatarComponent } from '../../tools/user-avatar/user-avatar.component';
import { CurrentUserBadgeComponent } from '../badges/current-user-badge/current-user-badge.component';

describe('UserLinkComponent', () => {

    let component: UserLinkComponent;
    let fixture: ComponentFixture<UserLinkComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [UserLinkComponent, MockComponents(UserAvatarComponent, CurrentUserBadgeComponent)],
        })
            .compileComponents();

        fixture = TestBed.createComponent(UserLinkComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
