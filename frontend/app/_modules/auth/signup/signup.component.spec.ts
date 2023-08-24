import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { SignupComponent } from './signup.component';
import { ConfigService } from '../../../_services/config.service';
import { ApiGeneralService, ComentarioConfig } from '../../../../generated-api';
import { FederatedLoginComponent } from '../federated-login/federated-login.component';
import { PasswordInputComponent } from '../../tools/password-input/password-input.component';
import { DocsService } from '../../../_services/docs.service';

describe('SignupComponent', () => {

    let component: SignupComponent;
    let fixture: ComponentFixture<SignupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [SignupComponent, MockComponents(PasswordInputComponent, FederatedLoginComponent)],
            imports: [RouterTestingModule, FontAwesomeTestingModule],
            providers: [
                MockProvider(ConfigService, {config: {} as ComentarioConfig}),
                MockProvider(DocsService),
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
