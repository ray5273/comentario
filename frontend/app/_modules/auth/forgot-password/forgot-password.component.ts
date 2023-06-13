import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProcessingStatus } from '../../../_utils/processing-status';
import { ToastService } from '../../../_services/toast.service';
import { ApiGeneralService } from '../../../../generated-api';

@Component({
    selector: 'app-forgot-password',
    templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {

    readonly submitting = new ProcessingStatus();
    readonly form = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
    });

    constructor(
        private readonly router: Router,
        private readonly fb: FormBuilder,
        private readonly toastSvc: ToastService,
        private readonly api: ApiGeneralService,
    ) {}

    get email(): AbstractControl<string> {
        return this.form.get('email')!;
    }

    submit(): void {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.form.valid) {
            this.api.authPwdResetSendEmail({email: this.email.value})
                .pipe(this.submitting.processing())
                .subscribe(() => {
                    // Add a success toast
                    this.toastSvc.success('pwd-reset-email-sent').keepOnRouteChange();
                    // Go home
                    return this.router.navigate(['/']);
                });
        }
    }
}
