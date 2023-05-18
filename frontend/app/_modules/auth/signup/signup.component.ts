import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { faBan, faCheck } from '@fortawesome/free-solid-svg-icons';
import { ProcessingStatus } from '../../../_utils/processing-status';
import { Paths } from '../../../_utils/consts';
import { ApiAuthService } from '../../../../generated-api';
import { ConfigService } from '../../../_services/config.service';
import { Animations } from '../../../_utils/animations';

@Component({
    selector: 'app-signup',
    templateUrl: './signup.component.html',
    animations: [Animations.fadeInOut('slow')],
})
export class SignupComponent {

    isComplete = false;

    readonly Paths = Paths;
    readonly signupAllowed = this.cfgSvc.clientConfig.signupAllowed;
    readonly submitting = new ProcessingStatus();
    readonly form = this.fb.nonNullable.group({
        email:    ['', [Validators.email]],
        password: '',
        name:     '',
    });

    // Icons
    readonly faBan   = faBan;
    readonly faCheck = faCheck;

    constructor(
        private readonly fb: FormBuilder,
        private readonly router: Router,
        private readonly cfgSvc: ConfigService,
        private readonly api: ApiAuthService,
    ) {}

    get email(): AbstractControl<string> {
        return this.form.get('email')!;
    }

    get name(): AbstractControl<string> {
        return this.form.get('name')!;
    }

    submit(): void {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.form.valid) {
            const vals = this.form.value as Required<typeof this.form.value>;
            this.api.authSignup({email: vals.email, password: vals.password, name: vals.name})
                .pipe(this.submitting.processing())
                .subscribe(r => {
                    // If there's no confirmation email expected, redirect the user to login at once
                    if (r.isConfirmed) {
                        this.router.navigate([Paths.auth.login]);

                    // Show the info message otherwise
                    } else {
                        this.isComplete = true;
                    }
                });
        }
    }
}
