import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainPagePropertiesComponent } from './domain-page-properties.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { DomainMeta, DomainSelectorService } from '../../../_services/domain-selector.service';
import { ToolsModule } from '../../../../tools/tools.module';
import { NoDataComponent } from '../../../../tools/no-data/no-data.component';

describe('DomainPagePropertiesComponent', () => {

    let component: DomainPagePropertiesComponent;
    let fixture: ComponentFixture<DomainPagePropertiesComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainPagePropertiesComponent, MockComponents(NoDataComponent)],
            imports: [RouterTestingModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(DomainSelectorService, {domainMeta: of(new DomainMeta())}),
            ]
        });
        fixture = TestBed.createComponent(DomainPagePropertiesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
