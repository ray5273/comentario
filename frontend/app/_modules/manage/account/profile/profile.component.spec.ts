import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { ProfileComponent } from './profile.component';
import { ApiGeneralService, InstanceStaticConfig } from '../../../../../generated-api';
import { mockAuthService } from '../../../../_utils/_mocks.spec';
import { PluginService } from '../../../plugin/_services/plugin.service';
import { ConfigService } from '../../../../_services/config.service';
import { DynamicConfig } from '../../../../_models/config';

describe('ProfileComponent', () => {

    let component: ProfileComponent;
    let fixture: ComponentFixture<ProfileComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [ProfileComponent],
                providers: [
                    MockProvider(ConfigService, {
                        staticConfig: {} as InstanceStaticConfig,
                        dynamicConfig: of(new DynamicConfig()),
                    }),
                    MockProvider(ApiGeneralService),
                    MockProvider(PluginService),
                    mockAuthService(),
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
