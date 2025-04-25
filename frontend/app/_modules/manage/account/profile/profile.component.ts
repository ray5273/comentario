import { Component, effect, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { concat, EMPTY, first, Observable } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faAngleDown, faCopy, faPencil, faSkullCrossbones, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { NgbCollapseModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { AuthService } from '../../../../_services/auth.service';
import { ApiGeneralService, CurUserUpdateRequest, Principal } from '../../../../../generated-api';
import { ToastService } from '../../../../_services/toast.service';
import { XtraValidators } from '../../../../_utils/xtra-validators';
import { Utils } from '../../../../_utils/utils';
import { PluginService } from '../../../plugin/_services/plugin.service';
import { Paths } from '../../../../_utils/consts';
import { ConfigService } from '../../../../_services/config.service';
import { InstanceConfigItemKey } from '../../../../_models/config';
import { CopyTextDirective } from '../../../tools/_directives/copy-text.directive';
import { PasswordInputComponent } from '../../../tools/password-input/password-input.component';
import { UserAvatarComponent } from '../../../tools/user-avatar/user-avatar.component';
import { SpinnerDirective } from '../../../tools/_directives/spinner.directive';
import { PluginPlugComponent } from '../../../plugin/plugin-plug/plugin-plug.component';
import { ConfirmDirective } from '../../../tools/_directives/confirm.directive';
import { ValidatableDirective } from '../../../tools/_directives/validatable.directive';
import { PrincipalService } from '../../../../_services/principal.service';

@UntilDestroy()
@Component({
    selector: 'app-profile',
    imports: [
        ConfirmDirective,
        CopyTextDirective,
        FaIconComponent,
        NgbCollapseModule,
        NgbTooltipModule,
        PasswordInputComponent,
        PluginPlugComponent,
        ReactiveFormsModule,
        RouterLink,
        SpinnerDirective,
        UserAvatarComponent,
        ValidatableDirective,
    ],
    templateUrl: './profile.component.html',
})
export class ProfileComponent {

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

    /** Whether editing email is enabled. */
    canEditEmail = false;

    /** UI plugs destined for the profile page. */
    readonly plugs = this.pluginSvc.uiPlugsForLocation('profile');

    /** Available interface languages. */
    readonly languages = this.cfgSvc.staticConfig.uiLanguages || [];

    /** Processing statuses. */
    readonly saving          = new ProcessingStatus();
    readonly deleting        = new ProcessingStatus();
    readonly settingGravatar = new ProcessingStatus();

    readonly userForm = this.fb.nonNullable.group({
        email:       {value: '', disabled: true},
        name:        ['', [Validators.required, Validators.minLength(2), Validators.maxLength(63)]],
        websiteUrl:  ['', [XtraValidators.url(false)]],
        newPassword: '',
        curPassword: [{value: '', disabled: true}],
        langId:      [this.cfgSvc.staticConfig.defaultLangId, [Validators.required]],
    });

    readonly deleteConfirmationForm = this.fb.nonNullable.group({
        deleteComments: false,
        purgeComments:  [{value: false, disabled: true}],
        agreed:         false,
    });

    readonly Paths = Paths;

    // Icons
    readonly faAngleDown       = faAngleDown;
    readonly faCopy            = faCopy;
    readonly faPencil          = faPencil;
    readonly faSkullCrossbones = faSkullCrossbones;
    readonly faTrashAlt        = faTrashAlt;

    constructor(
        private readonly fb: FormBuilder,
        private readonly router: Router,
        private readonly authSvc: AuthService,
        private readonly principalSvc: PrincipalService,
        private readonly toastSvc: ToastService,
        private readonly api: ApiGeneralService,
        private readonly pluginSvc: PluginService,
        private readonly cfgSvc: ConfigService,
    ) {
        cfgSvc.dynamicConfig
            .pipe(first())
            .subscribe(dc => this.canEditEmail = dc.get(InstanceConfigItemKey.authEmailUpdateEnabled).val as boolean);

        // Disable Purge comments if Delete comments is off
        this.deleteConfirmationForm.controls.deleteComments.valueChanges
            .pipe(untilDestroyed(this))
            .subscribe(b => Utils.enableControls(b, this.deleteConfirmationForm.controls.purgeComments));

        // Monitor principal changes
        effect(() => {
            const p = this.principalSvc.principal();
            this.principal = p;
            this.principalUpdated = this.principalSvc.updatedTime();

            if (p) {
                // Make sure the current user's language is also on the list, event if it's not directly supported (in
                // which case a reasonable fallback will be used)
                if (!this.languages.find(l => l.id === p.langId)) {
                    this.languages.splice(0, 0, {id: p.langId, nameNative: p.langId});
                }

                // Update the form
                this.userForm.patchValue({email: p.email, name: p.name, websiteUrl: p.websiteUrl, langId: p.langId});

                // Local user: the old password is required and enabled if there's a new one
                if (p.isLocal) {
                    this.userForm.controls.newPassword.valueChanges
                        .pipe(untilDestroyed(this))
                        .subscribe(s => {
                            Utils.enableControls(!!s, this.userForm.controls.curPassword);
                            this.userForm.controls.curPassword.updateValueAndValidity();
                        });

                } else {
                    // Disable profile controls for a federated user
                    ['email', 'name', 'websiteUrl', 'curPassword', 'newPassword']
                        .forEach(c => this.userForm.get(c)!.disable());
                }
            }
        });
    }

    /**
     * Route to send the user to for changing their email. If undefined, email change by the user isn't possible.
     */
    get updateEmailRoute(): string | string[] | undefined {
        // Email update is only possible when the user is local
        if (this.principal?.isLocal) {
            // User can edit email themselves
            if (this.canEditEmail) {
                return Paths.manage.account.email;

            // User is a superuser
            } else if (this.principal.isSuperuser) {
                return [Paths.manage.users, this.principal.id!, 'edit'];
            }
        }

        // Email change isn't possible
        return undefined;
    }

    deleteAccount() {
        // Run deletion with the API
        const vals = this.deleteConfirmationForm.value;
        this.api.authDeleteProfile(vals)
            .pipe(this.deleting.processing())
            .subscribe(r => {
                // Reset the principal and update the authentication status
                this.principalSvc.setPrincipal(undefined);

                // Add a toast
                this.toastSvc.success({
                    messageId:         'account-deleted',
                    details:           vals.deleteComments ? $localize`${r.countDeletedComments} comments have been deleted` : undefined,
                    keepOnRouteChange: true});

                // Navigate to the home page
                this.router.navigate(['/']);
            });
    }

    submit() {
        // Mark all controls touched to display validation results
        this.userForm.markAllAsTouched();

        // Submit the form if it's valid
        if (!this.userForm.valid) {
            return;
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

    /**
     * Submit the user's avatar change, if any, to the backend.
     */
    private saveAvatar(): Observable<void> {
        // Only save the avatar if it's changed
        return this.avatarChanged ? this.api.curUserSetAvatar(this.avatarFile ?? undefined) : EMPTY;
    }

    /**
     * Submit the user's profile to the backend.
     */
    private saveProfile(): Observable<void> {
        return this.api.curUserUpdate(this.userForm.value as CurUserUpdateRequest);
    }
}
