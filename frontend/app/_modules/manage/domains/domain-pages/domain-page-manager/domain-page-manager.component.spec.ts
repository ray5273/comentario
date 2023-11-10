import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainPageManagerComponent } from './domain-page-manager.component';
import { DomainBadgeComponent } from '../../domain-badge/domain-badge.component';
import { SortSelectorComponent } from '../../../sort-selector/sort-selector.component';
import { SortPropertyComponent } from '../../../sort-selector/sort-property/sort-property.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { DomainMeta, DomainSelectorService } from '../../../_services/domain-selector.service';
import { ConfigService } from '../../../../../_services/config.service';
import { ToolsModule } from '../../../../tools/tools.module';

describe('DomainPageManagerComponent', () => {

    let component: DomainPageManagerComponent;
    let fixture: ComponentFixture<DomainPageManagerComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainPageManagerComponent, MockComponents(DomainBadgeComponent, SortSelectorComponent, SortPropertyComponent)],
            imports: [RouterTestingModule, ReactiveFormsModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService, {domainPageList: () => of({pages: []} as any)}),
                MockProvider(DomainSelectorService, {domainMeta: () => of(new DomainMeta())}),
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
