import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainUserManagerComponent } from './domain-user-manager.component';
import { DomainBadgeComponent } from '../../domain-badge/domain-badge.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { ConfigService } from '../../../../../_services/config.service';
import { SortSelectorComponent } from '../../../sort-selector/sort-selector.component';
import { SortPropertyComponent } from '../../../sort-selector/sort-property/sort-property.component';
import { ToolsModule } from '../../../../tools/tools.module';
import { ListFooterComponent } from '../../../../tools/list-footer/list-footer.component';
import { mockDomainSelector } from '../../../../../_utils/_mocks.spec';

describe('DomainUserManagerComponent', () => {

    let component: DomainUserManagerComponent;
    let fixture: ComponentFixture<DomainUserManagerComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [
                DomainUserManagerComponent,
                MockComponents(DomainBadgeComponent, ListFooterComponent, SortSelectorComponent, SortPropertyComponent)],
            imports: [ReactiveFormsModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(ConfigService),
                mockDomainSelector(),
            ],
        });
        fixture = TestBed.createComponent(DomainUserManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
