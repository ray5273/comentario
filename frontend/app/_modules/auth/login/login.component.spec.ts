import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MockComponent, MockDirective } from 'ng-mocks';
import { AuthService } from '../../../_services/auth.service';
import { AuthServiceMock } from '../../../_testing/mocks.spec';
import { PasswordInputComponent } from '../../tools/password-input/password-input.component';
import { SpinnerDirective } from '../../tools/_directives/spinner.directive';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
    let component: LoginComponent;
    let fixture: ComponentFixture<LoginComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [LoginComponent, MockComponent(PasswordInputComponent), MockDirective(SpinnerDirective)],
            imports: [RouterTestingModule, ReactiveFormsModule],
            providers: [
                {provide: AuthService, useValue: AuthServiceMock},
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(LoginComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
