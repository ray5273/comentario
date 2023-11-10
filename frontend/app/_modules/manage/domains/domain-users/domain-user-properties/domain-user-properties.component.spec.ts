import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainUserPropertiesComponent } from './domain-user-properties.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { ToolsModule } from '../../../../tools/tools.module';
import { NoDataComponent } from '../../../../tools/no-data/no-data.component';
import { mockDomainSelector } from '../../../../../_utils/_mocks.spec';

describe('DomainUserPropertiesComponent', () => {

    let component: DomainUserPropertiesComponent;
    let fixture: ComponentFixture<DomainUserPropertiesComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainUserPropertiesComponent, MockComponents(NoDataComponent)],
            imports: [FontAwesomeTestingModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                mockDomainSelector(),
            ],
        });
        fixture = TestBed.createComponent(DomainUserPropertiesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
