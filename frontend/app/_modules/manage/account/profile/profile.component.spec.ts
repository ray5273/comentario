import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockProviders, MockService } from 'ng-mocks';
import { ProfileComponent } from './profile.component';
import { AuthService } from '../../../../_services/auth.service';
import { ApiAuthService } from '../../../../../generated-api';

describe('ProfileComponent', () => {

    let component: ProfileComponent;
    let fixture: ComponentFixture<ProfileComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ProfileComponent],
            providers: [
                MockProviders(ApiAuthService),
                {provide: AuthService, useValue: MockService(AuthService, {principal: of(null)})},
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(ProfileComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
