import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../_services/auth.service';
import { Paths } from '../../../_utils/consts';
import { ProcessingStatus } from '../../../_utils/processing-status';
import { ToastService } from '../../../_services/toast.service';
import { PasswordInputComponent } from '../../tools/password-input/password-input.component';
import { SpinnerDirective } from '../../tools/_directives/spinner.directive';
import { FederatedLoginComponent } from '../federated-login/federated-login.component';
import { ValidatableDirective } from '../../tools/_directives/validatable.directive';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    imports: [
        ReactiveFormsModule,
        PasswordInputComponent,
        SpinnerDirective,
        RouterLink,
        FederatedLoginComponent,
        ValidatableDirective,
    ],
})
export class LoginComponent implements OnInit {

    submitting = new ProcessingStatus();

    readonly Paths = Paths;
    readonly form = this.fb.nonNullable.group({
        email:    ['', [Validators.required, Validators.email, Validators.minLength(6), Validators.maxLength(254)]],
        password: '',
    });

    constructor(
        private readonly fb: FormBuilder,
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly authSvc: AuthService,
        private readonly toastSvc: ToastService,
    ) {}

    ngOnInit(): void {
        // If there's the 'confirmed' parameter in the URL, display a toast
        if (this.route.snapshot.queryParamMap.has('confirmed')) {
            this.toastSvc.success('email-confirmed');
        }
    }

    submit(): void {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.form.valid) {
            // Remove any toasts
            this.toastSvc.clear();

            // Submit the form
            const vals = this.form.value;
            this.authSvc.login(vals.email!, vals.password!)
                .pipe(this.submitting.processing())
                // Redirect to saved URL or the dashboard on success
                .subscribe(() => this.router.navigateByUrl(this.authSvc.afterLoginRedirectUrl || Paths.manage.dashboard));
        }
    }
}
