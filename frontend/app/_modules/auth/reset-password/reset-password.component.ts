import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { ProcessingStatus } from '../../../_utils/processing-status';
import { ApiAuthService } from '../../../../generated-api';
import { Paths } from '../../../_utils/consts';
import { ToastService } from '../../../_services/toast.service';

@Component({
    selector: 'app-reset-password',
    templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {

    readonly submitting = new ProcessingStatus();
    readonly form = this.fb.nonNullable.group({
        newPassword: '',
    });
    readonly token: string;

    constructor(
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly fb: FormBuilder,
        private readonly toastSvc: ToastService,
        private readonly api: ApiAuthService,
    ) {
        this.token = router.getCurrentNavigation()?.extras?.state?.token;
    }

    submit() {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.form.valid) {
            this.api.curUserPwdResetChange({
                password: this.form.value.newPassword!,
                token:    this.token,
            })
                .pipe(this.submitting.processing())
                .subscribe(() => {
                    // Add a success toast
                    this.toastSvc.success('password-changed').keepOnRouteChange();
                    // Go back to the login page
                    return this.router.navigate([Paths.auth.login]);
                });
        }
    }
}
