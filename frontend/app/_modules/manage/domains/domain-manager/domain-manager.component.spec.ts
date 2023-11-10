import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainManagerComponent } from './domain-manager.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { ToolsModule } from '../../../tools/tools.module';
import { ConfigService } from '../../../../_services/config.service';
import { SortSelectorComponent } from '../../sort-selector/sort-selector.component';
import { SortPropertyComponent } from '../../sort-selector/sort-property/sort-property.component';
import { mockDomainSelector } from '../../../../_utils/_mocks.spec';

describe('DomainManagerComponent', () => {

    let component: DomainManagerComponent;
    let fixture: ComponentFixture<DomainManagerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainManagerComponent, MockComponents(SortSelectorComponent, SortPropertyComponent)],
            imports: [RouterTestingModule, ReactiveFormsModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService, {domainList: () => of({domains: []} as any)}),
                mockDomainSelector(),
                MockProvider(ConfigService),
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
