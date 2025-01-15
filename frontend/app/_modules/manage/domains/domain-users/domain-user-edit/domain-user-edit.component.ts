import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { combineLatestWith, ReplaySubject, switchMap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiGeneralService, DomainUser, Principal } from '../../../../../../generated-api';
import { DomainSelectorService } from '../../../_services/domain-selector.service';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { Paths } from '../../../../../_utils/consts';
import { ToastService } from '../../../../../_services/toast.service';
import { InfoBlockComponent } from '../../../../tools/info-block/info-block.component';
import { SpinnerDirective } from '../../../../tools/_directives/spinner.directive';
import { InfoIconComponent } from '../../../../tools/info-icon/info-icon.component';
import { DomainUserBadgeComponent } from '../../../badges/domain-user-badge/domain-user-badge.component';

type UserRole = 'owner' | 'moderator' | 'commenter' | 'readonly';

@UntilDestroy()
@Component({
    selector: 'app-domain-user-edit',
    templateUrl: './domain-user-edit.component.html',
    imports: [
        InfoBlockComponent,
        ReactiveFormsModule,
        SpinnerDirective,
        InfoIconComponent,
        DomainUserBadgeComponent,
        RouterLink,
    ],
})
export class DomainUserEditComponent implements OnInit {

    /** The domain user in question. */
    domainUser?: DomainUser;

    /** User's email. */
    email?: string;

    /** Currently authenticated principal. */
    principal?: Principal;

    private origRole?: UserRole;

    readonly loading = new ProcessingStatus();
    readonly saving  = new ProcessingStatus();
    readonly form = this.fb.nonNullable.group({
        role:                ['commenter' as UserRole, [Validators.required]],
        notifyReplies:       false,
        notifyModerator:     false,
        notifyCommentStatus: false,
    });

    private readonly id$ = new ReplaySubject<string>(1);

    constructor(
        private readonly fb: FormBuilder,
        private readonly router: Router,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly toastSvc: ToastService,
    ) {}

    @Input()
    set id(id: string) {
        this.id$.next(id);
    }

    ngOnInit(): void {
        // Subscribe to domain changes
        this.domainSelectorSvc.domainMeta(true)
            .pipe(
                untilDestroyed(this),
                // Nothing can be loaded unless there's a domain
                filter(meta => !!meta.domain),
                // Blend with user ID
                combineLatestWith(this.id$),
                // Fetch the domain user
                switchMap(([meta, id]) => {
                    this.principal = meta.principal;
                    return this.api.domainUserGet(id, meta.domain!.id!).pipe(this.loading.processing());
                }))
            .subscribe(r => {
                this.domainUser = r.domainUser;
                this.email      = r.user!.email;
                const du = this.domainUser!;
                this.origRole = du.isOwner ? 'owner' : du.isModerator ? 'moderator' : du.isCommenter ? 'commenter' : 'readonly';
                this.form.setValue({
                    role:                this.origRole,
                    notifyReplies:       !!du.notifyReplies,
                    notifyModerator:     !!du.notifyModerator,
                    notifyCommentStatus: !!du.notifyCommentStatus,
                });

                // Only superuser can change their own role
                if (this.domainUser?.userId === this.principal?.id && !this.principal?.isSuperuser) {
                    this.form.controls.role.disable();
                }
            });
    }

    submit() {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.form.valid) {
            const val = {role: this.origRole, ...this.form.value};
            this.api.domainUserUpdate(
                    this.domainUser!.userId!,
                    {
                        domainId:            this.domainUser!.domainId!,
                        isOwner:             val.role === 'owner',
                        isModerator:         val.role === 'moderator',
                        isCommenter:         val.role === 'commenter',
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
}
