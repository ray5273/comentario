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
import { ConfigService } from '../../../../../_services/config.service';
import { ToolsModule } from '../../../../tools/tools.module';
import { mockDomainSelector } from '../../../../../_utils/_mocks.spec';

describe('DomainPageManagerComponent', () => {

    let component: DomainPageManagerComponent;
    let fixture: ComponentFixture<DomainPageManagerComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainPageManagerComponent, MockComponents(DomainBadgeComponent, SortSelectorComponent, SortPropertyComponent)],
            imports: [RouterModule.forRoot([]), ReactiveFormsModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService, {domainPageList: () => of({pages: []} as any)}),
                mockDomainSelector(),
                MockProvider(ConfigService),
            ],
        });
        fixture = TestBed.createComponent(DomainPageManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
