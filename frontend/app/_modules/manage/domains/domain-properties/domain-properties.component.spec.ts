import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainPropertiesComponent } from './domain-properties.component';
import { ConfigService } from '../../../../_services/config.service';
import { DomainBadgeComponent } from '../domain-badge/domain-badge.component';
import { InstanceStaticConfig } from '../../../../../generated-api';
import { NoDataComponent } from '../../../tools/no-data/no-data.component';
import { ToolsModule } from '../../../tools/tools.module';
import { InfoIconComponent } from '../../../tools/info-icon/info-icon.component';
import { mockDomainSelector } from '../../../../_utils/_mocks.spec';

describe('DomainPropertiesComponent', () => {

    let component: DomainPropertiesComponent;
    let fixture: ComponentFixture<DomainPropertiesComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [
                DomainPropertiesComponent,
                MockComponents(DomainBadgeComponent, NoDataComponent, InfoIconComponent),
            ],
            imports: [RouterModule.forRoot([]), FontAwesomeTestingModule, ToolsModule],
            providers: [
                MockProvider(ConfigService, {staticConfig: {baseUrl: '/'} as InstanceStaticConfig, extensions: of(undefined)}),
                mockDomainSelector(),
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
