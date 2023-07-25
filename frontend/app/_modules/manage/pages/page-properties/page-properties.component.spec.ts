import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PagePropertiesComponent } from './page-properties.component';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { MockComponents, MockProvider } from 'ng-mocks';
import { ApiGeneralService } from '../../../../../generated-api';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';
import { ToolsModule } from '../../../tools/tools.module';
import { NoDataComponent } from '../../no-data/no-data.component';

describe('PagePropertiesComponent', () => {

    let component: PagePropertiesComponent;
    let fixture: ComponentFixture<PagePropertiesComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [PagePropertiesComponent, MockComponents(NoDataComponent)],
            imports: [RouterTestingModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(DomainSelectorService, {domainMeta: of(new DomainMeta())}),
            ]
        });
        fixture = TestBed.createComponent(PagePropertiesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
