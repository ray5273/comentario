import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../_services/auth.service';
import { Paths } from '../../../_utils/consts';
import { ProcessingStatus } from '../../../_utils/processing-status';
import { ToastService } from '../../../_services/toast.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {

    submitting = new ProcessingStatus();

    readonly Paths = Paths;
    readonly form = this.fb.nonNullable.group({
        email:    ['', [Validators.required, Validators.email]],
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
