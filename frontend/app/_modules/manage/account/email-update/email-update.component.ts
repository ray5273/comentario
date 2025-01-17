import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ToastService } from '../../../../_services/toast.service';
import { ApiGeneralService } from '../../../../../generated-api';
import { Paths } from '../../../../_utils/consts';
import { AuthService } from '../../../../_services/auth.service';
import { Animations } from '../../../../_utils/animations';
import { PasswordInputComponent } from '../../../tools/password-input/password-input.component';
import { SpinnerDirective } from '../../../tools/_directives/spinner.directive';
import { ValidatableDirective } from '../../../tools/_directives/validatable.directive';

@Component({
    selector: 'app-email-update',
    templateUrl: './email-update.component.html',
    animations: [Animations.fadeInOut('slow')],
    imports: [
        ReactiveFormsModule,
        PasswordInputComponent,
        RouterLink,
        SpinnerDirective,
        ValidatableDirective,
    ],
})
export class EmailUpdateComponent {

    /** Whether the form has been submitted and an email confirmation is expected. */
    submitted = false;

    readonly submitting = new ProcessingStatus();
    readonly form = this.fb.nonNullable.group({
        email:    ['', [Validators.required, Validators.email, Validators.minLength(6), Validators.maxLength(254)]],
        password: '',
    });

    readonly Paths = Paths;

    constructor(
        private readonly router: Router,
        private readonly fb: FormBuilder,
        private readonly toastSvc: ToastService,
        private readonly api: ApiGeneralService,
        private readonly authSvc: AuthService,
    ) {}

    submit() {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.form.valid) {
            const vals = this.form.value;
            this.api.curUserEmailUpdateRequest({email: vals.email!, password: vals.password!})
                .pipe(this.submitting.processing())
                .subscribe(r => {
                    // If the user has to confirm the new email first
                    if (r?.confirmationExpected) {
                        this.submitted = true;

                    } else {
                        // The email has been changed right away: add a success toast
                        this.toastSvc.success({messageId: 'data-saved', keepOnRouteChange: true});
                        // Reload the principal
                        this.authSvc.update();
                        // Go back to the login page
                        this.router.navigate([Paths.manage.account.profile]);
                    }
                });
        }
    }
}
