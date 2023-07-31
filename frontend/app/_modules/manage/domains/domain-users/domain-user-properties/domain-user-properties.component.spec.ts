import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainUserPropertiesComponent } from './domain-user-properties.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { DomainMeta, DomainSelectorService } from '../../../_services/domain-selector.service';
import { ToolsModule } from '../../../../tools/tools.module';
import { NoDataComponent } from '../../../no-data/no-data.component';

describe('DomainUserPropertiesComponent', () => {

    let component: DomainUserPropertiesComponent;
    let fixture: ComponentFixture<DomainUserPropertiesComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainUserPropertiesComponent, MockComponents(NoDataComponent)],
            imports: [FontAwesomeTestingModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(DomainSelectorService, {domainMeta: of(new DomainMeta())}),
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
