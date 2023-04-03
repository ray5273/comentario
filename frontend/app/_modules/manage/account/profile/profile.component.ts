import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder } from '@angular/forms';
import { faAngleDown, faSkullCrossbones, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { AuthService } from '../../../../_services/auth.service';
import { ApiAuthService, Principal } from '../../../../../generated-api';
import { Router } from '@angular/router';
import { ToastService } from '../../../../_services/toast.service';
import { PasswordInputComponent } from '../../../tools/password-input/password-input.component';

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {

    @ViewChild('curPassword')
    curPassword?: PasswordInputComponent;

    /** Whether the "Danger zone" is collapsed. */
    isDangerZoneCollapsed = true;

    /** Currently logged-in principal. */
    principal?: Principal | null;

    /** Processing statuses. */
    readonly saving = new ProcessingStatus();
    readonly deleting = new ProcessingStatus();

    readonly userForm = this.fb.nonNullable.group({
        email:       '',
        name:        '',
        curPassword: '',
        newPassword: '',
    });

    readonly deleteConfirmationForm = this.fb.nonNullable.group({
        agreed: false,
    });

    // Icons
    readonly faAngleDown       = faAngleDown;
    readonly faSkullCrossbones = faSkullCrossbones;
    readonly faTrashAlt        = faTrashAlt;

    constructor(
        private readonly fb: FormBuilder,
        private readonly router: Router,
        private readonly authSvc: AuthService,
        private readonly toastSvc: ToastService,
        private readonly api: ApiAuthService,
    ) {}

    get name(): AbstractControl<string> {
        return this.userForm.get('name')!;
    }

    get agreed(): AbstractControl<boolean> {
        return this.deleteConfirmationForm.get('agreed')!;
    }

    ngOnInit(): void {
        // Old password is required if there's a new one
        this.userForm.get('newPassword')?.valueChanges.subscribe(s => {
            this.curPassword!.required = !!s;
            this.userForm.get('curPassword')?.updateValueAndValidity();
        });

        // Monitor principal changes
        this.authSvc.principal.subscribe(p => {
            this.principal = p;

            // Update the form
            if (p) {
                this.userForm.patchValue({email: p.email, name: p.name});
            }
        });
    }

    deleteAccount() {
        // Run deletion with the API
        this.api.authDeleteProfile()
            .pipe(this.deleting.processing())
            .subscribe(() => {
                // Reset the principal and update the authentication status
                this.authSvc.update(null);
                // Add a toast
                this.toastSvc.success('account-deleted').keepOnRouteChange();
                // Navigate to the home page
                this.router.navigate(['/']);
            });
    }

    submit() {
        // Mark all controls touched to display validation results
        this.userForm.markAllAsTouched();

        // Submit the form if it's valid
        if (this.userForm.valid) {
            const vals = this.userForm.value;
            this.api.curUserProfileUpdate({name: vals.name!, curPassword: vals.curPassword, newPassword: vals.newPassword})
                .pipe(this.saving.processing())
                .subscribe(() => {
                    // Update the logged-in principal
                    this.authSvc.update();
                    // Add a success toast
                    this.toastSvc.success('data-saved');
                });
        }
    }
}
