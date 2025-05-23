import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { MockComponents } from 'ng-mocks';
import { UserDetailsComponent } from './user-details.component';
import { UserAvatarComponent } from '../../../tools/user-avatar/user-avatar.component';

describe('UserDetailsComponent', () => {

    let component: UserDetailsComponent;
    let fixture: ComponentFixture<UserDetailsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    RouterModule.forRoot([]),
                    UserDetailsComponent,
                    MockComponents(UserAvatarComponent),
                ],
            })
            .compileComponents();
        fixture = TestBed.createComponent(UserDetailsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
