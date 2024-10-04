import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserAvatarComponent } from './user-avatar.component';
import { Configuration } from '../../../../generated-api';

describe('UserAvatarComponent', () => {

    let component: UserAvatarComponent;
    let fixture: ComponentFixture<UserAvatarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [UserAvatarComponent],
            providers: [
                {provide: Configuration, useValue: {}},
            ],
        })
            .compileComponents();
        fixture = TestBed.createComponent(UserAvatarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
