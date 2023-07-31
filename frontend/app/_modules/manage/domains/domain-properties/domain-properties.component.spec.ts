import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainPropertiesComponent } from './domain-properties.component';
import { ConfigService } from '../../../../_services/config.service';
import { DocsService } from '../../../../_services/docs.service';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';
import { DomainBadgeComponent } from '../domain-badge/domain-badge.component';
import { ComentarioConfig } from '../../../../../generated-api';
import { NoDataComponent } from '../../no-data/no-data.component';

describe('DomainPropertiesComponent', () => {

    let component: DomainPropertiesComponent;
    let fixture: ComponentFixture<DomainPropertiesComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainPropertiesComponent, MockComponents(DomainBadgeComponent, NoDataComponent)],
            imports: [RouterTestingModule, FontAwesomeTestingModule],
            providers: [
                MockProvider(ConfigService, {config: {baseUrl: '/'} as ComentarioConfig}),
                MockProvider(DocsService),
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
