import { Component, Input, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatestWith, ReplaySubject, switchMap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faCheck, faTrashAlt, faUpRightFromSquare, faXmark } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, Comment, Commenter, DomainPage } from '../../../../../../generated-api';
import { DomainMeta, DomainSelectorService } from '../../../_services/domain-selector.service';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { Paths } from '../../../../../_utils/consts';

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

    readonly Paths = Paths;

    readonly loading  = new ProcessingStatus();
    readonly deleting = new ProcessingStatus();
    readonly updating = new ProcessingStatus();

    // Icons
    readonly faCheck             = faCheck;
    readonly faTrashAlt          = faTrashAlt;
    readonly faUpRightFromSquare = faUpRightFromSquare;
    readonly faXmark             = faXmark;

    private readonly reload$ = new BehaviorSubject<void>(undefined);
    private readonly id$     = new ReplaySubject<string>();

    constructor(
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}

    @Input()
    set id(id: string) {
        this.id$.next(id);
    }

    ngOnInit(): void {
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
            });
    }

    delete() {
        this.api.commentDelete(this.comment!.id!)
            .pipe(this.deleting.processing())
            .subscribe(() => this.reload$.next());
    }

    moderate(approved: boolean) {
        if (!this.comment) {
            return;
        }

        // If the comment is pending moderation, set to approved/rejected
        let pending = !!this.comment.isPending;
        if (pending) {
            pending = false;

        // Comment is already approved/rejected. If the state stays the same, make the comment pending again
        } else if (this.comment.isApproved === approved) {
            pending = true;
        }

        // Update the comment
        this.api.commentModerate(this.comment.id!, {pending, approved})
            .pipe(this.updating.processing())
            .subscribe(() => this.reload$.next());
    }
}
