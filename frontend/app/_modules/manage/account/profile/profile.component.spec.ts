import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MockProvider } from 'ng-mocks';
import { ProfileComponent } from './profile.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { mockConfigService } from '../../../../_utils/_mocks.spec';
import { PluginService } from '../../../plugin/_services/plugin.service';
import { AuthService } from '../../../../_services/auth.service';
import { PrincipalService } from '../../../../_services/principal.service';

describe('ProfileComponent', () => {

    let component: ProfileComponent;
    let fixture: ComponentFixture<ProfileComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [ProfileComponent],
                providers: [
                    MockProvider(ApiGeneralService),
                    MockProvider(PluginService),
                    MockProvider(AuthService),
                    MockProvider(PrincipalService, {principal: signal(undefined), updatedTime: signal(0)}),
                    mockConfigService(),
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
