import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainSsoSecretComponent } from './domain-sso-secret.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { DomainBadgeComponent } from '../../badges/domain-badge/domain-badge.component';
import { mockDomainSelector } from '../../../../_utils/_mocks.spec';

describe('DomainSsoSecretComponent', () => {

    let component: DomainSsoSecretComponent;
    let fixture: ComponentFixture<DomainSsoSecretComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    RouterModule.forRoot([]),
                    FontAwesomeTestingModule,
                    DomainSsoSecretComponent,
                    MockComponents(DomainBadgeComponent),
                ],
                providers: [
                    MockProvider(ApiGeneralService),
                    mockDomainSelector(),
                ],
            })
            .compileComponents();
        fixture = TestBed.createComponent(DomainSsoSecretComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
