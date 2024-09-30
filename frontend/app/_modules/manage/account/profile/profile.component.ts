import { Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { concat, EMPTY, Observable } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faAngleDown, faCopy, faSkullCrossbones, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { AuthService } from '../../../../_services/auth.service';
import { ApiGeneralService, Principal } from '../../../../../generated-api';
import { ToastService } from '../../../../_services/toast.service';
import { PasswordInputComponent } from '../../../tools/password-input/password-input.component';
import { XtraValidators } from '../../../../_utils/xtra-validators';
import { Utils } from '../../../../_utils/utils';
import { Paths } from '../../../../_utils/consts';
import { PluginService } from '../../../plugin/plugin.service';

@UntilDestroy()
@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {

    @ViewChild('curPassword')
    curPassword?: PasswordInputComponent;

    @ViewChild('avatarFileInput')
    avatarFileInput?: ElementRef<HTMLInputElement>;

    /** Whether the avatar has been changed by the user. */
    avatarChanged = false;

    /** Whether the "Danger zone" is collapsed. */
    isDangerZoneCollapsed = true;

    /** Currently logged-in principal. */
    principal?: Principal;

    /** Timestamp of the last principal update. */
    principalUpdated?: number;

    /** Selected (but not yet uploaded) avatar image. */
    avatarFile?: File | null;

    /** UI plugs destined for the profile page. */
    readonly plugs = this.pluginSvc.uiPlugsForLocation('profile');

    /** Processing statuses. */
    readonly saving          = new ProcessingStatus();
    readonly deleting        = new ProcessingStatus();
    readonly settingGravatar = new ProcessingStatus();

    readonly userForm = this.fb.nonNullable.group({
        email:       {value: '', disabled: true},
        name:        ['', [Validators.required, Validators.minLength(2), Validators.maxLength(63)]],
        websiteUrl:  ['', [XtraValidators.url(false)]],
        curPassword: '',
        newPassword: '',
    });

    readonly deleteConfirmationForm = this.fb.nonNullable.group({
        deleteComments: false,
        purgeComments:  [{value: false, disabled: true}],
        agreed:         false,
    });

    // Icons
    readonly faAngleDown       = faAngleDown;
    readonly faCopy            = faCopy;
    readonly faSkullCrossbones = faSkullCrossbones;
    readonly faTrashAlt        = faTrashAlt;

    constructor(
        private readonly renderer: Renderer2,
        private readonly fb: FormBuilder,
        private readonly router: Router,
        private readonly authSvc: AuthService,
        private readonly toastSvc: ToastService,
        private readonly api: ApiGeneralService,
        private readonly pluginSvc: PluginService,
    ) {
        // Disable Purge comments if Delete comments is off
        this.deleteConfirmationForm.controls.deleteComments.valueChanges
            .pipe(untilDestroyed(this))
            .subscribe(b => Utils.enableControls(b, this.deleteConfirmationForm.controls.purgeComments));
    }

    ngOnInit(): void {
        // Monitor principal changes
        this.authSvc.principal.subscribe(p => {
            this.principal = p;
            this.principalUpdated = this.authSvc.principalUpdated;

            // Update the form
            if (p) {
                this.userForm.patchValue({email: p.email, name: p.name, websiteUrl: p.websiteUrl});

                // Local user: the old password is required if there's a new one
                if (p.isLocal) {
                    this.userForm.controls.newPassword.valueChanges
                        .pipe(untilDestroyed(this))
                        .subscribe(s => {
                            this.curPassword!.required = !!s;
                            this.userForm.controls.curPassword.updateValueAndValidity();
                        });

                } else {
                    // Disable all profile controls for a federated user
                    Object.values(this.userForm.controls).forEach(c => c.disable());
                }
            }
        });
    }

    deleteAccount() {
        // Run deletion with the API
        const vals = this.deleteConfirmationForm.value;
        this.api.authDeleteProfile(vals)
            .pipe(this.deleting.processing())
            .subscribe(r => {
                // Reset the principal and update the authentication status
                this.authSvc.update(null);
                // Add a toast
                this.toastSvc.success(
                    'account-deleted',
                    undefined,
                    vals.deleteComments ? $localize`${r.countDeletedComments} comments have been deleted` : undefined,
                ).keepOnRouteChange();
                // Navigate to the home page
                this.router.navigate(['/']);
            });
    }

    submit() {
        // If it's a local user
        if (this.principal?.isLocal) {
            // Mark all controls touched to display validation results
            this.userForm.markAllAsTouched();

            // Submit the form if it's valid
            if (!this.userForm.valid) {
                return;
            }
        }

        // Update profile/avatar
        concat(this.saveProfile(), this.saveAvatar())
            .pipe(this.saving.processing())
            .subscribe({
                complete: () => {
                    // Reset form status
                    this.userForm.markAsPristine();

                    // Reset avatar status
                    this.clearAvatar(false, false);

                    // Update the logged-in principal
                    this.authSvc.update();

                    // Add a success toast
                    this.toastSvc.success('data-saved');
                },
            });
    }

    uploadAvatar() {
        this.avatarFileInput?.nativeElement.click();
    }

    downloadGravatar() {
        this.api.curUserSetAvatarFromGravatar()
            .pipe(this.settingGravatar.processing())
            .subscribe(() => {
                // Reset avatar status
                this.clearAvatar(false, false);

                // Reload the principal with the new avatar
                this.authSvc.update();
            });
    }

    removeAvatar() {
        this.clearAvatar(true, !!this.principal?.hasAvatar);
    }

    avatarSelected() {
        // Get the file
        const files = this.avatarFileInput?.nativeElement.files;
        const f = files && files.length > 0 ? files[0] : undefined;

        // Verify its format and size
        if (f && f.type !== 'image/jpeg' && f.type !== 'image/png') {
            this.toastSvc.error('invalid-avatar-format');
        } else if (f && f.size > 1024 * 1024) {
            this.toastSvc.error('invalid-avatar-size');
        } else {
            this.avatarFile = f;
            this.avatarChanged = true;
        }
    }

    /**
     * Remove the current avatar, optionally marking it as changed
     * @private
     */
    private clearAvatar(forceRemove: boolean, changed: boolean) {
        this.avatarFile = forceRemove ? null : undefined;
        this.avatarFileInput!.nativeElement.value = '';
        this.avatarChanged = changed;
    }

    private saveAvatar(): Observable<void> {
        // Only save the avatar if it's changed
        return this.avatarChanged ? this.api.curUserSetAvatar(this.avatarFile ?? undefined) : EMPTY;
    }

    private saveProfile(): Observable<void> {
        // Not applicable if the user isn't a locally authenticated one
        if (!this.principal!.isLocal) {
            return EMPTY;
        }

        // Update the user's profile
        const vals = this.userForm.value;
        return this.api.curUserUpdate({
            name:        vals.name!,
            websiteUrl:  vals.websiteUrl,
            curPassword: vals.curPassword,
            newPassword: vals.newPassword,
        });
    }

    protected readonly Paths = Paths;
}
