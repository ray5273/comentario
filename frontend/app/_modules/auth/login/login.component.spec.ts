import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MockComponents, MockDirective, MockProviders } from 'ng-mocks';
import { AuthService } from '../../../_services/auth.service';
import { PasswordInputComponent } from '../../tools/password-input/password-input.component';
import { SpinnerDirective } from '../../tools/_directives/spinner.directive';
import { LoginComponent } from './login.component';
import { FederatedLoginComponent } from '../federated-login/federated-login.component';

describe('LoginComponent', () => {
    let component: LoginComponent;
    let fixture: ComponentFixture<LoginComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [
                LoginComponent,
                MockComponents(PasswordInputComponent, FederatedLoginComponent),
                MockDirective(SpinnerDirective)],
            imports: [RouterModule.forRoot([]), ReactiveFormsModule],
            providers: [MockProviders(AuthService)],
        })
            .compileComponents();

        fixture = TestBed.createComponent(LoginComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
