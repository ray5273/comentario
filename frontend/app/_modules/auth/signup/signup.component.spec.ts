import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { SignupComponent } from './signup.component';
import { ConfigService } from '../../../_services/config.service';
import { ApiGeneralService, InstanceStaticConfig } from '../../../../generated-api';
import { FederatedLoginComponent } from '../federated-login/federated-login.component';
import { PasswordInputComponent } from '../../tools/password-input/password-input.component';
import { DynamicConfig } from '../../../_models/config';

describe('SignupComponent', () => {

    let component: SignupComponent;
    let fixture: ComponentFixture<SignupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [SignupComponent, MockComponents(PasswordInputComponent, FederatedLoginComponent)],
            imports: [RouterTestingModule, FontAwesomeTestingModule],
            providers: [
                MockProvider(ConfigService, {staticConfig: {} as InstanceStaticConfig, dynamicConfig: of(new DynamicConfig())}),
                MockProvider(ApiGeneralService),
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(SignupComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
