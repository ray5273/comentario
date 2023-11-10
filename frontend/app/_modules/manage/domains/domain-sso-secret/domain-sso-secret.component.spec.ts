import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainSsoSecretComponent } from './domain-sso-secret.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { DomainBadgeComponent } from '../domain-badge/domain-badge.component';
import { ToolsModule } from '../../../tools/tools.module';
import { mockDomainSelector } from '../../../../_utils/_mocks.spec';

describe('DomainSsoSecretComponent', () => {

    let component: DomainSsoSecretComponent;
    let fixture: ComponentFixture<DomainSsoSecretComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainSsoSecretComponent, MockComponents(DomainBadgeComponent)],
            imports: [RouterTestingModule, FontAwesomeTestingModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                mockDomainSelector(),
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
