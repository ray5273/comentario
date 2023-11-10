import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainPagePropertiesComponent } from './domain-page-properties.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { ToolsModule } from '../../../../tools/tools.module';
import { NoDataComponent } from '../../../../tools/no-data/no-data.component';
import { mockDomainSelector } from '../../../../../_utils/_mocks.spec';

describe('DomainPagePropertiesComponent', () => {

    let component: DomainPagePropertiesComponent;
    let fixture: ComponentFixture<DomainPagePropertiesComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainPagePropertiesComponent, MockComponents(NoDataComponent)],
            imports: [RouterTestingModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                mockDomainSelector(),
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
