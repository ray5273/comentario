import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { faAngleDown, faSkullCrossbones, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { AuthService } from '../../../../_services/auth.service';
import { ApiGeneralService, Principal } from '../../../../../generated-api';
import { ToastService } from '../../../../_services/toast.service';
import { PasswordInputComponent } from '../../../tools/password-input/password-input.component';
import { mergeMap, of } from 'rxjs';

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {

    @ViewChild('curPassword')
    curPassword?: PasswordInputComponent;

    @ViewChild('avatarFileInput')
    avatarFileInput?: ElementRef<HTMLInputElement>;

    /** Whether the "Danger zone" is collapsed. */
    isDangerZoneCollapsed = true;

    /** Currently logged-in principal. */
    principal?: Principal | null;

    /** Selected (but not yet uploaded) avatar image. */
    avatarFile?: File | null;

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

    private avatarChanged = false;

    constructor(
        private readonly fb: FormBuilder,
        private readonly router: Router,
        private readonly authSvc: AuthService,
        private readonly toastSvc: ToastService,
        private readonly api: ApiGeneralService,
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
            this.api.curUserUpdate({name: vals.name!, curPassword: vals.curPassword, newPassword: vals.newPassword})
                .pipe(
                    // Save the user's avatar, if needed
                    mergeMap(() => this.avatarChanged ? this.api.curUserSetAvatar(this.avatarFile ?? undefined) : of(undefined)),
                    this.saving.processing())
                .subscribe(() => {
                    // Reset avatar status
                    this.avatarChanged = false;
                    this.avatarFile = undefined;
                    this.avatarFileInput!.nativeElement.value = '';

                    // Update the logged-in principal
                    this.authSvc.update();
                    // Add a success toast
                    this.toastSvc.success('data-saved');
                });
        }
    }

    changeAvatar() {
        this.avatarFileInput?.nativeElement.click();
    }

    removeAvatar() {
        this.avatarFile = null;
        this.avatarFileInput!.nativeElement.value = '';
        if (this.principal?.hasAvatar) {
            this.avatarChanged = true;
        }
    }

    avatarSelected() {
        // Get the file
        const files = this.avatarFileInput?.nativeElement.files;
        const f = files && files.length > 0 ? files[0] : undefined;

        // Verify its format and size
        if (f && f.type !== 'image/jpeg' && f.type !== 'image/png') {
            this.toastSvc.error('invalid-avatar-format');
        } else if (f && f.size > 100*1024) {
            this.toastSvc.error('invalid-avatar-size');
        } else {
            this.avatarFile = f;
            this.avatarChanged = true;
        }
    }
}
