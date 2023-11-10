import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainSsoSecretComponent } from './domain-sso-secret.component';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';
import { ApiGeneralService } from '../../../../../generated-api';
import { DomainBadgeComponent } from '../domain-badge/domain-badge.component';
import { ToolsModule } from '../../../tools/tools.module';

describe('DomainSsoSecretComponent', () => {

    let component: DomainSsoSecretComponent;
    let fixture: ComponentFixture<DomainSsoSecretComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainSsoSecretComponent, MockComponents(DomainBadgeComponent)],
            imports: [RouterTestingModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(DomainSelectorService, {domainMeta: () => of(new DomainMeta())}),
            ],
        });
        fixture = TestBed.createComponent(DomainSsoSecretComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
