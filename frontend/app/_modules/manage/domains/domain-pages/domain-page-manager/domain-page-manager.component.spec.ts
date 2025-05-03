import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainPageManagerComponent } from './domain-page-manager.component';
import { DomainBadgeComponent } from '../../../badges/domain-badge/domain-badge.component';
import { SortSelectorComponent } from '../../../sort-selector/sort-selector.component';
import { SortPropertyComponent } from '../../../sort-selector/sort-property/sort-property.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { mockConfigService, mockDomainSelector, mockLocalSettingService } from '../../../../../_utils/_mocks.spec';

describe('DomainPageManagerComponent', () => {

    let component: DomainPageManagerComponent;
    let fixture: ComponentFixture<DomainPageManagerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    RouterModule.forRoot([]),
                    ReactiveFormsModule,
                    DomainPageManagerComponent,
                    MockComponents(DomainBadgeComponent, SortSelectorComponent, SortPropertyComponent),
                ],
                providers: [
                    MockProvider(ApiGeneralService, {domainPageList: () => of({pages: []} as any)}),
                    mockLocalSettingService(),
                    mockConfigService(),
                    mockDomainSelector(),
                ],
            })
            .compileComponents();
        fixture = TestBed.createComponent(DomainPageManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
