import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainPropertiesComponent } from './domain-properties.component';
import { ConfigService } from '../../../../_services/config.service';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';
import { DomainBadgeComponent } from '../domain-badge/domain-badge.component';
import { InstanceStaticConfig } from '../../../../../generated-api';
import { NoDataComponent } from '../../no-data/no-data.component';
import { ToolsModule } from '../../../tools/tools.module';
import { InfoIconComponent } from '../../../tools/info-icon/info-icon.component';

describe('DomainPropertiesComponent', () => {

    let component: DomainPropertiesComponent;
    let fixture: ComponentFixture<DomainPropertiesComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [
                DomainPropertiesComponent,
                MockComponents(DomainBadgeComponent, NoDataComponent, InfoIconComponent),
            ],
            imports: [RouterTestingModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                MockProvider(ConfigService, {staticConfig: {baseUrl: '/'} as InstanceStaticConfig, extensions: of(undefined)}),
                MockProvider(DomainSelectorService, {domainMeta: of(new DomainMeta())}),
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainPropertiesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
