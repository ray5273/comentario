import { Component, computed, effect, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiGeneralService, User } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ToastService } from '../../../../_services/toast.service';
import { Paths } from '../../../../_utils/consts';
import { Utils } from '../../../../_utils/utils';
import { XtraValidators } from '../../../../_utils/xtra-validators';
import { ConfigService } from '../../../../_services/config.service';
import { SpinnerDirective } from '../../../tools/_directives/spinner.directive';
import { PasswordInputComponent } from '../../../tools/password-input/password-input.component';
import { InfoIconComponent } from '../../../tools/info-icon/info-icon.component';
import { ValidatableDirective } from '../../../tools/_directives/validatable.directive';
import { PrincipalService } from '../../../../_services/principal.service';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
    selector: 'app-user-edit',
    templateUrl: './user-edit.component.html',
    imports: [
        ReactiveFormsModule,
        SpinnerDirective,
        PasswordInputComponent,
        InfoIconComponent,
        RouterLink,
        ValidatableDirective,
    ],
})
export class UserEditComponent {

    /** ID of the domain page to edit. */
    readonly id = input<string>();

    /** User being edited. */
    readonly user = toSignal(toObservable(this.id)
        .pipe(switchMap(id => id ? this.api.userGet(id).pipe(this.loading.processing(), map(r => r.user)) : EMPTY)));

    /** Available interface languages. */
    readonly languages = this.cfgSvc.staticConfig.uiLanguages || [];

    /** ID of the currently authenticated user. */
    readonly curUserId = computed(() => this.principalSvc.principal()?.id);

    readonly loading = new ProcessingStatus();
    readonly saving  = new ProcessingStatus();

    readonly form = this.fb.nonNullable.group({
        name:       ['', [Validators.required, Validators.minLength(2), Validators.maxLength(63)]],
        email:      ['', [Validators.required, Validators.email, Validators.minLength(6), Validators.maxLength(254)]],
        password:   '',
        websiteUrl: ['', [XtraValidators.url(false)]],
        langId:     ['', [Validators.required]],
        remarks:    ['', [Validators.maxLength(4096)]],
        confirmed:  false,
        superuser:  false,
    });

    constructor(
        private readonly fb: FormBuilder,
        private readonly router: Router,
        private readonly api: ApiGeneralService,
        private readonly cfgSvc: ConfigService,
        private readonly principalSvc: PrincipalService,
        private readonly toastSvc: ToastService,
    ) {
        effect(() => {
            const u = this.user();
            if (u) {
                // Make sure the current user's language is also on the list, event if it's not directly supported (in
                // which case a reasonable fallback will be used)
                if (!this.languages.find(l => l.id === u.langId)) {
                    this.languages.splice(0, 0, {id: u.langId, nameNative: u.langId});
                }

                // Update the form
                this.form.setValue({
                    name:       u.name ?? '',
                    email:      u.email ?? '',
                    password:   '',
                    websiteUrl: u.websiteUrl ?? '',
                    langId:     u.langId,
                    remarks:    u.remarks ?? '',
                    confirmed:  !!u.confirmed,
                    superuser:  !!u.isSuperuser,
                });
            }

            // If the user is a federated one, disable irrelevant controls
            if (u?.federatedIdP || u?.federatedSso) {
                ['name', 'email', 'password', 'websiteUrl'].forEach(c => this.form.get(c)!.disable());
            }

            // Disable checkboxes when the user edits themselves
            Utils.enableControls(
                this.curUserId() !== u?.id,
                this.form.controls.confirmed, this.form.controls.superuser);
        });
    }

    submit(): void {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        const uid = this.user()?.id;
        if (uid && this.form.valid) {
            const selfEdit = this.curUserId() === uid;
            const vals = this.form.value;
            const dto: User = {
                name:        vals.name,
                email:       vals.email,
                password:    vals.password,
                websiteUrl:  vals.websiteUrl,
                langId:      vals.langId!,
                remarks:     vals.remarks,
                confirmed:   selfEdit || vals.confirmed,
                isSuperuser: selfEdit || vals.superuser,
            };
            this.api.userUpdate(uid, {user: dto})
                .pipe(this.saving.processing())
                .subscribe(r => {
                    // Add a success toast
                    this.toastSvc.success({messageId: 'data-saved', keepOnRouteChange: true});
                    // Navigate to the user properties
                    return this.router.navigate([Paths.manage.users, r.user!.id]);
                });
        }
    }
}
