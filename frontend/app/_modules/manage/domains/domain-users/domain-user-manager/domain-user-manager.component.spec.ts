import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainMeta, DomainSelectorService } from '../../../_services/domain-selector.service';
import { DomainUserManagerComponent } from './domain-user-manager.component';
import { DomainBadgeComponent } from '../../domain-badge/domain-badge.component';
import { NoDataComponent } from '../../../no-data/no-data.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { ConfigService } from '../../../../../_services/config.service';
import { SortSelectorComponent } from '../../../sort-selector/sort-selector.component';
import { SortPropertyComponent } from '../../../sort-selector/sort-property/sort-property.component';
import { ToolsModule } from '../../../../tools/tools.module';

describe('DomainUserManagerComponent', () => {

    let component: DomainUserManagerComponent;
    let fixture: ComponentFixture<DomainUserManagerComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [
                DomainUserManagerComponent,
                MockComponents(DomainBadgeComponent, NoDataComponent, SortSelectorComponent, SortPropertyComponent)],
            imports: [ReactiveFormsModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(ConfigService),
                MockProvider(DomainSelectorService, {domainMeta: of(new DomainMeta())}),
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
