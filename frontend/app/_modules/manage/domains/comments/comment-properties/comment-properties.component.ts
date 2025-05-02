import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, combineLatestWith, EMPTY, from, ReplaySubject, switchMap } from 'rxjs';
import { catchError, filter } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NgbModal, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faTrashAlt, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Highlight } from 'ngx-highlightjs';
import { ApiGeneralService, Comment, Commenter, DomainPage, Principal, User } from '../../../../../../generated-api';
import { DomainMeta, DomainSelectorService } from '../../../_services/domain-selector.service';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { AnonymousUser, Paths } from '../../../../../_utils/consts';
import { ConfirmDialogComponent } from '../../../../tools/confirm-dialog/confirm-dialog.component';
import { CommentService } from '../../../_services/comment.service';
import { SpinnerDirective } from '../../../../tools/_directives/spinner.directive';
import { ExternalLinkDirective } from '../../../../tools/_directives/external-link.directive';
import { CommentStatusBadgeComponent } from '../../../badges/comment-status-badge/comment-status-badge.component';
import { CheckmarkComponent } from '../../../../tools/checkmark/checkmark.component';
import { DatetimePipe } from '../../../_pipes/datetime.pipe';
import { UserLinkComponent } from '../../../user-link/user-link.component';
import { CountryNamePipe } from '../../../_pipes/country-name.pipe';
import { CopyTextDirective } from '../../../../tools/_directives/copy-text.directive';
import { NoDataComponent } from '../../../../tools/no-data/no-data.component';

@UntilDestroy()
@Component({
    selector: 'app-comment-properties',
    templateUrl: './comment-properties.component.html',
    imports: [
        SpinnerDirective,
        FaIconComponent,
        ExternalLinkDirective,
        RouterLink,
        CommentStatusBadgeComponent,
        CheckmarkComponent,
        DatetimePipe,
        UserLinkComponent,
        CountryNamePipe,
        CopyTextDirective,
        NgbNavModule,
        Highlight,
        NoDataComponent,
    ],
})
export class CommentPropertiesComponent implements OnInit {

    /** The comment in question. */
    comment?: Comment;

    /** The comment author (if any). */
    commenter?: Commenter;

    /** Link route for the commenter domain user. */
    commenterRoute?: string[];

    /** User who moderated the comment. */
    userModerated?: User | Principal;

    /** Link route for the user who moderated the comment. */
    userModeratedRoute?: string[];

    /** User who deleted the comment. */
    userDeleted?: User | Principal;

    /** Link route for the user who deleted the comment. */
    userDeletedRoute?: string[];

    /** User who edited the comment. */
    userEdited?: User | Principal;

    /** Link route for the user who edited the comment. */
    userEditedRoute?: string[];

    /** Domain page the comment is on. */
    page?: DomainPage;

    /** Domain/user metadata. */
    domainMeta?: DomainMeta;

    /** Optional action extracted from query param. */
    action?: string;

    readonly Paths = Paths;
    readonly AnonymousUser = AnonymousUser;

    readonly loading  = new ProcessingStatus();
    readonly deleting = new ProcessingStatus();
    readonly updating = new ProcessingStatus();

    // Icons
    readonly faCheck    = faCheck;
    readonly faTrashAlt = faTrashAlt;
    readonly faXmark    = faXmark;

    private readonly reload$ = new BehaviorSubject<void>(undefined);
    private readonly id$     = new ReplaySubject<string>(1);

    constructor(
        private readonly route: ActivatedRoute,
        private readonly modal: NgbModal,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly commentService: CommentService,
    ) {}

    @Input()
    set id(id: string) {
        this.id$.next(id);
    }

    ngOnInit(): void {
        // Check of there's an action passed in
        this.action = this.route.snapshot.queryParamMap.get('action') ?? undefined;

        // Subscribe to domain changes
        this.domainSelectorSvc.domainMeta(true)
            .pipe(
                untilDestroyed(this),
                // Nothing can be loaded unless there's a domain
                filter(meta => !!meta.domain),
                // Blend with user ID
                combineLatestWith(this.id$),
                // Fetch the domain user and the corresponding user
                switchMap(([meta, id]) => {
                    this.domainMeta = meta;
                    return this.reload$.pipe(switchMap(() => this.api.commentGet(id).pipe(this.loading.processing())));
                }))
            .subscribe(r => {
                this.comment       = r.comment;
                this.commenter     = r.commenter;
                this.userModerated = r.moderator;
                this.userDeleted   = r.deleter;
                this.userEdited    = r.editor;
                this.page          = r.page;

                // If the comment is by an unregistered user, imitate the anonymous user
                if (!this.commenter && this.comment?.userCreated === AnonymousUser.id) {
                    this.commenter = AnonymousUser;
                }

                // If moderator/deleter/editor refer to the current user, copy the principal into them
                if (!this.userModerated && r.comment?.userModerated === this.domainMeta?.principal?.id) {
                    this.userModerated = this.domainMeta?.principal;
                }
                if (!this.userDeleted && r.comment?.userDeleted === this.domainMeta?.principal?.id) {
                    this.userDeleted = this.domainMeta?.principal;
                }
                if (!this.userEdited && r.comment?.userEdited === this.domainMeta?.principal?.id) {
                    this.userEdited = this.domainMeta?.principal;
                }

                // Prepare link routes for users (Anonymous has no domain user, so no link)
                const isSuper = this.domainMeta?.principal?.isSuperuser;
                if (this.commenter && this.page && this.domainMeta?.canManageDomain) {
                    // If the user is Anonymous, there's no domain user, but superuser may see the user properties
                    if (this.commenter.id === AnonymousUser.id) {
                        if (isSuper) {
                            this.commenterRoute = [Paths.manage.users, this.commenter.id!];
                        }

                    // Non-anonymous existing user
                    } else {
                        this.commenterRoute = [Paths.manage.domains, this.page.domainId!, 'users', this.commenter.id!];
                    }
                }
                if (isSuper) {
                    if (this.userModerated) {
                        this.userModeratedRoute = [Paths.manage.users, this.userModerated.id!];
                    }
                    if (this.userDeleted) {
                        this.userDeletedRoute = [Paths.manage.users, this.userDeleted.id!];
                    }
                    if (this.userEdited) {
                        this.userEditedRoute = [Paths.manage.users, this.userEdited.id!];
                    }
                }

                // If there's a comment and an action, apply it
                if (this.comment && this.action) {
                    this.runAction();
                }
            });
    }

    delete() {
        // Show a confirmation dialog
        const mr = this.modal.open(ConfirmDialogComponent);
        const dlg = (mr.componentInstance as ConfirmDialogComponent);
        dlg.content    .set($localize`Are you sure you want to delete this comment?`);
        dlg.actionLabel.set($localize`Delete comment`);

        // Run the dialog
        from(mr.result)
            .pipe(
                // Ignore when canceled
                catchError(() => EMPTY),
                // Run deletion when confirmed
                switchMap(() => this.api.commentDelete(this.comment!.id!).pipe(this.deleting.processing())))
            .subscribe(() => {
                this.reload$.next();
                this.commentService.refresh();
            });
    }

    moderate(approve: boolean) {
        if (!this.comment) {
            return;
        }

        // If the comment is pending moderation, set to approved/rejected
        let pending = !!this.comment.isPending;
        if (pending) {
            pending = false;

        // Comment is already approved/rejected. If the state stays the same, make the comment pending again
        } else if (this.comment.isApproved === approve) {
            pending = true;
        }

        // Update the comment
        this.api.commentModerate(this.comment.id!, {pending, approve})
            .pipe(this.updating.processing())
            .subscribe(() => {
                this.reload$.next();
                this.commentService.refresh();
            });
    }

    private runAction() {
        switch (this.action) {
            case 'approve':
                if (this.comment?.isPending) {
                    this.moderate(true);
                }
                break;

            case 'reject':
                if (this.comment?.isPending) {
                    this.moderate(false);
                }
                break;

            case 'delete':
                if (!this.comment?.isDeleted) {
                    this.delete();
                }
                break;
        }


        // Remove the action to prevent re-doing it
        this.action = undefined;
    }
}
