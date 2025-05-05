import { Component, effect, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, switchMap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiGeneralService, DomainUser, DomainUserRole, Principal } from '../../../../../../generated-api';
import { DomainSelectorService } from '../../../_services/domain-selector.service';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { Paths } from '../../../../../_utils/consts';
import { ToastService } from '../../../../../_services/toast.service';
import { InfoBlockComponent } from '../../../../tools/info-block/info-block.component';
import { SpinnerDirective } from '../../../../tools/_directives/spinner.directive';
import { InfoIconComponent } from '../../../../tools/info-icon/info-icon.component';
import { DomainUserRoleBadgeComponent } from '../../../badges/domain-user-role-badge/domain-user-role-badge.component';

@UntilDestroy()
@Component({
    selector: 'app-domain-user-edit',
    templateUrl: './domain-user-edit.component.html',
    imports: [
        InfoBlockComponent,
        ReactiveFormsModule,
        SpinnerDirective,
        InfoIconComponent,
        DomainUserRoleBadgeComponent,
        RouterLink,
    ],
})
export class DomainUserEditComponent {

    /** ID of the domain user to edit. */
    readonly id = input<string>();

    /** The domain user in question. */
    domainUser?: DomainUser;

    /** User's email. */
    email?: string;

    /** Currently authenticated principal. */
    principal?: Principal;

    readonly loading = new ProcessingStatus();
    readonly saving  = new ProcessingStatus();
    readonly form = this.fb.nonNullable.group({
        role:                [DomainUserRole.Commenter, [Validators.required]],
        notifyReplies:       false,
        notifyModerator:     false,
        notifyCommentStatus: false,
    });

    constructor(
        private readonly fb: FormBuilder,
        private readonly router: Router,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly toastSvc: ToastService,
    ) {
        // Load the domain user initially, and reload on changes
        effect(() => this.reload());
    }

    submit() {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.form.valid) {
            const val = {role: this.domainUser?.role, ...this.form.value};
            this.api.domainUserUpdate(
                    this.domainUser!.userId!,
                    {
                        domainId:            this.domainUser!.domainId!,
                        role:                val.role,
                        notifyReplies:       val.notifyReplies,
                        notifyModerator:     val.notifyModerator,
                        notifyCommentStatus: val.notifyCommentStatus,
                    })
                .pipe(this.saving.processing())
                .subscribe(() => {
                    // Add a success toast
                    this.toastSvc.success({messageId: 'data-saved', keepOnRouteChange: true});
                    // Go back to the domain user properties
                    this.router.navigate([Paths.manage.domains, this.domainUser!.domainId!, 'users', this.domainUser!.userId]);
                });
        }
    }

    /**
     * Reload the domain user properties.
     * @private
     */
    private reload() {
        // Subscribe to domain changes
        this.domainSelectorSvc.domainMeta(true)
            .pipe(
                untilDestroyed(this),
                // Nothing can be loaded unless there's a domain
                filter(meta => !!meta.domain),
                // Fetch the domain user
                switchMap(meta => {
                    this.principal = meta.principal;
                    const id = this.id();
                    return id ? this.api.domainUserGet(id, meta.domain!.id!).pipe(this.loading.processing()) : EMPTY;
                }))
            .subscribe(r => {
                this.domainUser = r.domainUser;
                this.email      = r.user!.email;
                const du = this.domainUser!;
                this.form.setValue({
                    role:                du.role,
                    notifyReplies:       du.notifyReplies,
                    notifyModerator:     du.notifyModerator,
                    notifyCommentStatus: du.notifyCommentStatus,
                });

                // Only superuser can change their own role
                if (this.domainUser?.userId === this.principal?.id && !this.principal?.isSuperuser) {
                    this.form.controls.role.disable();
                }
            });
    }
}
