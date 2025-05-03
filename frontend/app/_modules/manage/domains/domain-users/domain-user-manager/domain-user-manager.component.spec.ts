import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainUserManagerComponent } from './domain-user-manager.component';
import { DomainBadgeComponent } from '../../../badges/domain-badge/domain-badge.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { SortSelectorComponent } from '../../../sort-selector/sort-selector.component';
import { SortPropertyComponent } from '../../../sort-selector/sort-property/sort-property.component';
import { ListFooterComponent } from '../../../../tools/list-footer/list-footer.component';
import { mockConfigService, mockDomainSelector, mockLocalSettingService } from '../../../../../_utils/_mocks.spec';

describe('DomainUserManagerComponent', () => {

    let component: DomainUserManagerComponent;
    let fixture: ComponentFixture<DomainUserManagerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    ReactiveFormsModule,
                    FontAwesomeTestingModule,
                    DomainUserManagerComponent,
                    MockComponents(
                        DomainBadgeComponent,
                        ListFooterComponent,
                        SortSelectorComponent,
                        SortPropertyComponent),
                ],
                providers: [
                    MockProvider(ApiGeneralService),
                    mockLocalSettingService(),
                    mockConfigService(),
                    mockDomainSelector(),
                ],
            })
            .compileComponents();
        fixture = TestBed.createComponent(DomainUserManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
