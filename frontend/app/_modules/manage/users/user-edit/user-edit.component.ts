import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiGeneralService, Principal, User } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ToastService } from '../../../../_services/toast.service';
import { Paths } from '../../../../_utils/consts';
import { AuthService } from '../../../../_services/auth.service';
import { Utils } from '../../../../_utils/utils';
import { XtraValidators } from '../../../../_utils/xtra-validators';
import { ConfigService } from '../../../../_services/config.service';
import { SpinnerDirective } from '../../../tools/_directives/spinner.directive';
import { PasswordInputComponent } from '../../../tools/password-input/password-input.component';
import { InfoIconComponent } from '../../../tools/info-icon/info-icon.component';
import { ValidatableDirective } from '../../../tools/_directives/validatable.directive';

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
export class UserEditComponent implements OnInit {

    /** User being edited. */
    user?: User;

    /** Currently authenticated principal. */
    principal?: Principal;

    /** Available interface languages. */
    readonly languages = this.cfgSvc.staticConfig.uiLanguages || [];

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
        private readonly authSvc: AuthService,
        private readonly toastSvc: ToastService,
    ) {}

    @Input()
    set id(id: string) {
        // Fetch the user
        this.api.userGet(id)
            .pipe(this.loading.processing())
            .subscribe(r => {
                this.user = r.user!;

                // Make sure the current user's language is also on the list, event if it's not directly supported (in
                // which case a reasonable fallback will be used)
                if (!this.languages.find(l => l.id === this.user!.langId)) {
                    this.languages.splice(0, 0, {id: this.user.langId, nameNative: this.user.langId});
                }

                // Update the form
                this.form.setValue({
                    name:       this.user.name ?? '',
                    email:      this.user.email ?? '',
                    password:   '',
                    websiteUrl: this.user.websiteUrl ?? '',
                    langId:     this.user.langId,
                    remarks:    this.user.remarks ?? '',
                    confirmed:  !!this.user.confirmed,
                    superuser:  !!this.user.isSuperuser,
                });
                this.enableControls();
            });
    }

    ngOnInit(): void {
        // Monitor principal changes
        this.authSvc.principal.subscribe(p => {
            this.principal = p;
            this.enableControls();
        });
    }

    submit(): void {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.user && this.form.valid) {
            const selfEdit = this.principal!.id === this.user.id;
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
            this.api.userUpdate(this.user.id!, {user: dto})
                .pipe(this.saving.processing())
                .subscribe(r => {
                    // Add a success toast
                    this.toastSvc.success({messageId: 'data-saved', keepOnRouteChange: true});
                    // Navigate to the user properties
                    return this.router.navigate([Paths.manage.users, r.user!.id]);
                });
        }
    }

    private enableControls() {
        // If the user is a federated one, disable irrelevant controls
        if (this.user?.federatedIdP || this.user?.federatedSso) {
            ['name', 'email', 'password', 'websiteUrl'].forEach(c => this.form.get(c)!.disable());
        }

        // Disable checkboxes when the user edits themselves
        Utils.enableControls(this.principal?.id !== this.user?.id, this.form.controls.confirmed, this.form.controls.superuser);
    }
}
