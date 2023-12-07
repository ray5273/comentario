import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponents } from 'ng-mocks';
import { UserDetailsComponent } from './user-details.component';
import { UserAvatarComponent } from '../../../tools/user-avatar/user-avatar.component';

describe('UserDetailsComponent', () => {

    let component: UserDetailsComponent;
    let fixture: ComponentFixture<UserDetailsComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [UserDetailsComponent, MockComponents(UserAvatarComponent)],
        });
        fixture = TestBed.createComponent(UserDetailsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
