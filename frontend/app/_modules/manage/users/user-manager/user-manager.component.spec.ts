import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MockComponents, MockProvider } from 'ng-mocks';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { UserManagerComponent } from './user-manager.component';
import { SortSelectorComponent } from '../../sort-selector/sort-selector.component';
import { SortPropertyComponent } from '../../sort-selector/sort-property/sort-property.component';
import { IdentityProviderIconComponent } from '../../../tools/identity-provider-icon/identity-provider-icon.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { mockConfigService, mockLocalSettingService } from '../../../../_utils/_mocks.spec';

describe('UserManagerComponent', () => {

    let component: UserManagerComponent;
    let fixture: ComponentFixture<UserManagerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    ReactiveFormsModule,
                    FontAwesomeTestingModule,
                    UserManagerComponent,
                    MockComponents(SortSelectorComponent, SortPropertyComponent, IdentityProviderIconComponent),
                ],
                providers: [
                    MockProvider(ApiGeneralService),
                    mockLocalSettingService(),
                    mockConfigService(),
                ],
            })
            .compileComponents();
        fixture = TestBed.createComponent(UserManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
