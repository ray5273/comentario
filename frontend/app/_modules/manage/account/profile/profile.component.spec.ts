import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { ProfileComponent } from './profile.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { mockAuthService, mockConfigService } from '../../../../_utils/_mocks.spec';
import { PluginService } from '../../../plugin/_services/plugin.service';

describe('ProfileComponent', () => {

    let component: ProfileComponent;
    let fixture: ComponentFixture<ProfileComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [ProfileComponent],
                providers: [
                    MockProvider(ApiGeneralService),
                    MockProvider(PluginService),
                    mockAuthService(),
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
