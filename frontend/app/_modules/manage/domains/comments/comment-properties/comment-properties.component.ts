import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatestWith, EMPTY, from, ReplaySubject, switchMap } from 'rxjs';
import { catchError, filter } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { faCheck, faTrashAlt, faXmark } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, Comment, Commenter, DomainPage } from '../../../../../../generated-api';
import { DomainMeta, DomainSelectorService } from '../../../_services/domain-selector.service';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { Paths } from '../../../../../_utils/consts';
import { ConfirmDialogComponent } from '../../../../tools/confirm-dialog/confirm-dialog.component';
import { CommentService } from '../../../_services/comment.service';
import { Utils } from '../../../../../_utils/utils';

@UntilDestroy()
@Component({
    selector: 'app-comment-properties',
    templateUrl: './comment-properties.component.html',
})
export class CommentPropertiesComponent implements OnInit {

    /** The comment in question. */
    comment?: Comment;

    /** The comment author (if any). */
    commenter?: Commenter;

    /** Domain page the comment is on. */
    page?: DomainPage;

    /** Domain/user metadata. */
    domainMeta?: DomainMeta;

    /** Optional action extracted from query param. */
    action?: string;

    /** Anonymous user ID. */
    readonly anonUserId = Utils.ANONYMOUS_USER_ID;

    readonly Paths = Paths;

    readonly loading  = new ProcessingStatus();
    readonly deleting = new ProcessingStatus();
    readonly updating = new ProcessingStatus();

    // Icons
    readonly faCheck    = faCheck;
    readonly faTrashAlt = faTrashAlt;
    readonly faXmark    = faXmark;

    private readonly reload$ = new BehaviorSubject<void>(undefined);
    private readonly id$     = new ReplaySubject<string>();

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
        this.domainSelectorSvc.domainMeta
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
                this.comment   = r.comment;
                this.commenter = r.commenter;
                this.page      = r.page;

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
        dlg.content     = $localize`Are you sure you want to delete this comment?`;
        dlg.actionLabel = $localize`Delete`;

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
