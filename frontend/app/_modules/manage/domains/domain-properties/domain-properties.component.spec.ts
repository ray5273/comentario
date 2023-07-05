import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponent, MockProvider } from 'ng-mocks';
import { DomainPropertiesComponent } from './domain-properties.component';
import { ConfigService } from '../../../../_services/config.service';
import { DocsService } from '../../../../_services/docs.service';
import { DomainSelectorService } from '../../_services/domain-selector.service';
import { DomainBadgeComponent } from '../../domain-badge/domain-badge.component';
import { ComentarioConfig } from '../../../../../generated-api';

describe('DomainPropertiesComponent', () => {

    let component: DomainPropertiesComponent;
    let fixture: ComponentFixture<DomainPropertiesComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainPropertiesComponent, MockComponent(DomainBadgeComponent)],
            imports: [RouterTestingModule, FontAwesomeTestingModule],
            providers: [
                MockProvider(ConfigService, {config: {baseUrl: '/'} as ComentarioConfig}),
                MockProvider(DocsService),
                MockProvider(DomainSelectorService, {domainUserIdps: of({})}),
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
