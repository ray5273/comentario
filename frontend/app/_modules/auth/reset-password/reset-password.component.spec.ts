import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MockComponent, MockDirective, MockProviders } from 'ng-mocks';
import { ResetPasswordComponent } from './reset-password.component';
import { ApiGeneralService, Configuration } from '../../../../generated-api';
import { ToastService } from '../../../_services/toast.service';
import { PasswordInputComponent } from '../../tools/password-input/password-input.component';
import { SpinnerDirective } from '../../tools/_directives/spinner.directive';

describe('ResetPasswordComponent', () => {

    let component: ResetPasswordComponent;
    let fixture: ComponentFixture<ResetPasswordComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [
                ResetPasswordComponent,
                MockComponent(PasswordInputComponent),
                MockDirective(SpinnerDirective),
            ],
            imports: [RouterTestingModule, ReactiveFormsModule],
            providers: [
                {provide: Configuration, useValue: new Configuration()},
                ...MockProviders(ToastService, ApiGeneralService),
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(ResetPasswordComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
