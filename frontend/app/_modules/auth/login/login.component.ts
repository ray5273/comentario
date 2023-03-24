import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../_services/auth.service';
import { Paths } from '../../../_utils/consts';
import { ProcessingStatus } from '../../../_utils/processing-status';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
})
export class LoginComponent {

    submitting = new ProcessingStatus();

    readonly Paths = Paths;
    readonly form = this.fb.nonNullable.group({
        email:    ['', [Validators.required, Validators.email]],
        password: '',
    });

    constructor(
        private readonly fb: FormBuilder,
        private readonly router: Router,
        private readonly authSvc: AuthService,
    ) {}

    get email(): AbstractControl<string> {
        return this.form.get('email')!;
    }

    submit(): void {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.form.valid) {
            const vals = this.form.value;
            this.authSvc.login(vals.email!, vals.password!)
                .pipe(this.submitting.processing())
                // Redirect to saved URL or the dashboard on success
                .subscribe(() => this.router.navigateByUrl(this.authSvc.afterLoginRedirectUrl || Paths.manage.dashboard));
        }
    }
}
