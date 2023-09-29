import { Component, Input } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiGeneralService, User } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ToastService } from '../../../../_services/toast.service';
import { Paths } from '../../../../_utils/consts';

@Component({
    selector: 'app-user-edit',
    templateUrl: './user-edit.component.html',
})
export class UserEditComponent {

    /** User being edited. */
    user?: User;

    readonly loading = new ProcessingStatus();
    readonly saving  = new ProcessingStatus();

    readonly form = this.fb.nonNullable.group({
        name:       ['', [Validators.required, Validators.minLength(2), Validators.maxLength(63)]],
        email:      ['', [Validators.required, Validators.email, Validators.minLength(6), Validators.maxLength(254)]],
        password:   '',
        websiteUrl: ['', [Validators.maxLength(2083)]],
        remarks:    ['', [Validators.maxLength(4096)]],
        confirmed:  false,
        superuser:  false,
    });

    constructor(
        private readonly fb: FormBuilder,
        private readonly router: Router,
        private readonly api: ApiGeneralService,
        private readonly toastSvc: ToastService,
    ) {}

    @Input()
    set id(id: string) {
        // Fetch the user
        this.api.userGet(id)
            .pipe(this.loading.processing())
            .subscribe(r => {
                this.user = r.user;

                // Update the form
                this.form.setValue({
                    name:       this.user!.name ?? '',
                    email:      this.user!.email ?? '',
                    password:   '',
                    remarks:    this.user!.remarks ?? '',
                    websiteUrl: this.user!.websiteUrl ?? '',
                    confirmed:  !!this.user!.confirmed,
                    superuser:  !!this.user!.isSuperuser,
                });

                // If the user is a federated one, disable irrelevant controls
                if (this.user!.federatedIdP || this.user!.federatedSso) {
                    this.form.controls.name    .disable();
                    this.form.controls.email   .disable();
                    this.form.controls.password.disable();
                }
            });
    }

    submit(): void {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.user && this.form.valid) {
            const vals = this.form.value;
            const dto: User = {
                name:        vals.name,
                email:       vals.email,
                password:    vals.password,
                remarks:     vals.remarks,
                websiteUrl:  vals.websiteUrl,
                confirmed:   vals.confirmed,
                isSuperuser: vals.superuser,
            };
            this.api.userUpdate(this.user.id!, {user: dto})
                .pipe(this.saving.processing())
                .subscribe(r => {
                    // Add a success toast
                    this.toastSvc.success('data-saved').keepOnRouteChange();
                    // Navigate to the user properties
                    return this.router.navigate([Paths.manage.users, r.user!.id]);
                });
        }
    }
}
