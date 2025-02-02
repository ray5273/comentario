import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { SignupComponent } from './signup.component';
import { ApiGeneralService } from '../../../../generated-api';
import { FederatedLoginComponent } from '../federated-login/federated-login.component';
import { PasswordInputComponent } from '../../tools/password-input/password-input.component';
import { mockConfigService } from '../../../_utils/_mocks.spec';

describe('SignupComponent', () => {

    let component: SignupComponent;
    let fixture: ComponentFixture<SignupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    RouterModule.forRoot([]),
                    FontAwesomeTestingModule,
                    SignupComponent,
                    MockComponents(PasswordInputComponent, FederatedLoginComponent),
                ],
                providers: [
                    MockProvider(ApiGeneralService),
                    mockConfigService(),
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
