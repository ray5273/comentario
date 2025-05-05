import { Component, effect, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, merge, mergeWith, Subject, switchMap, tap } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faQuestion, faTrashAlt, faXmark } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, Comment, Commenter } from '../../../../../../generated-api';
import { DomainMeta, DomainSelectorService } from '../../../_services/domain-selector.service';
import { ConfigService } from '../../../../../_services/config.service';
import { Sort } from '../../../_models/sort';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { Utils } from '../../../../../_utils/utils';
import { Paths } from '../../../../../_utils/consts';
import { CommentService } from '../../../_services/comment.service';
import { Animations } from '../../../../../_utils/animations';
import { InfoBlockComponent } from '../../../../tools/info-block/info-block.component';
import { SortSelectorComponent } from '../../../sort-selector/sort-selector.component';
import { SortPropertyComponent } from '../../../sort-selector/sort-property/sort-property.component';
import { UserLinkComponent } from '../../../user-link/user-link.component';
import { CommentStatusBadgeComponent } from '../../../badges/comment-status-badge/comment-status-badge.component';
import { ExternalLinkDirective } from '../../../../tools/_directives/external-link.directive';
import { DatetimePipe } from '../../../_pipes/datetime.pipe';
import { ConfirmDirective } from '../../../../tools/_directives/confirm.directive';
import { ListFooterComponent } from '../../../../tools/list-footer/list-footer.component';
import { LoaderDirective } from '../../../../tools/_directives/loader.directive';
import { LocalSettingService } from '../../../../../_services/local-setting.service';
import { SortableViewSettings } from '../../../_models/view';

@UntilDestroy()
@Component({
    selector: 'app-comment-list',
    templateUrl: './comment-list.component.html',
    animations: [Animations.fadeIn('slow')],
    imports: [
        InfoBlockComponent,
        ReactiveFormsModule,
        SortSelectorComponent,
        SortPropertyComponent,
        FaIconComponent,
        RouterLink,
        UserLinkComponent,
        CommentStatusBadgeComponent,
        ExternalLinkDirective,
        DatetimePipe,
        ConfirmDirective,
        ListFooterComponent,
        LoaderDirective,
    ],
})
export class CommentListComponent {

    /** Optional page ID to load comments for. If not provided, all comments for the current domain will be loaded. */
    readonly pageId = input<string>();

    /** Optional user ID to load comments for. If not provided, comments by all users will be loaded. */
    readonly userId = input<string>();

    /** Domain/user metadata. */
    domainMeta?: DomainMeta;

    /** Loaded list of comments. */
    comments?: Comment[];

    /** Whether there are more results to load. */
    canLoadMore = true;

    /** Loaded commenters. */
    readonly commenters = new Map<string, Commenter>();

    /** Observable triggering a next page load. */
    readonly loadMore = new Subject<void>();

    readonly Paths = Paths;
    readonly sort = new Sort(['created', 'score'], 'created', true);
    readonly commentsLoading = new ProcessingStatus();
    readonly commentUpdating = new ProcessingStatus();

    readonly filterForm = this.fb.nonNullable.group({
        approved: true,
        pending:  true,
        rejected: true,
        deleted:  false,
        filter:   '',
    });

    // Icons
    readonly faCheck    = faCheck;
    readonly faQuestion = faQuestion;
    readonly faTrashAlt = faTrashAlt;
    readonly faXmark    = faXmark;

    private loadedPageNum = 0;

    constructor(
        private readonly fb: FormBuilder,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly configSvc: ConfigService,
        private readonly localSettingSvc: LocalSettingService,
        private readonly commentService: CommentService,
    ) {
        // Restore the view settings
        localSettingSvc.load<SortableViewSettings>('commentList').subscribe(s => s?.sort && (this.sort.asString = s.sort));

        // Reload on property changes
        effect(() => this.reload());
    }

    deleteComment(c: Comment) {
        // Delete the comment
        this.api.commentDelete(c.id!)
            .pipe(this.commentUpdating.processing())
            .subscribe(() => {
                // If deleted comments are to be shown, mark comment deleted
                if (!this.domainMeta?.canModerateDomain || this.filterForm.controls.deleted.value) {
                    c.isDeleted = true;
                    c.html = '';

                // Remove the comment from the list otherwise
                } else {
                    const i = this.comments?.findIndex(item => item.id === c.id);
                    if (i && i >= 0) {
                        this.comments!.splice(i, 1);
                    }
                }

                // Poke the comment service
                this.commentService.refresh();
            });
    }

    moderateComment(e: Event, c: Comment, approve: boolean) {
        // Do not propagate the click to prevent navigating into comment properties
        e.stopPropagation();
        e.preventDefault();

        // If the comment is pending moderation, set to approved/rejected
        let pending = !!c.isPending;
        if (pending) {
            pending = false;

        // Comment is already approved/rejected. If the state stays the same, make the comment pending again
        } else if (c.isApproved === approve) {
            pending = true;
        }

        // Update the comment
        this.api.commentModerate(c.id!, {pending, approve})
            .pipe(this.commentUpdating.processing())
            .subscribe(() => {
                c.isPending  = pending;
                c.isApproved = approve;

                // Poke the comment service
                this.commentService.refresh();
            });
    }

    filterAll() {
        this.filterForm.setValue({
            approved: true,
            pending:  true,
            rejected: true,
            deleted:  true,
            filter:   '',
        });
    }

    filterPending() {
        this.filterForm.setValue({
            approved: false,
            pending:  true,
            rejected: false,
            deleted:  false,
            filter:   '',
        });
    }

    filterUndeleted() {
        this.filterForm.setValue({
            approved: true,
            pending:  true,
            rejected: true,
            deleted:  false,
            filter:   '',
        });
    }

    /**
     * Reload the comment list.
     * @private
     */
    private reload() {
        merge(
            // Subscribe to domain changes. This will also trigger an initial load
            this.domainSelectorSvc.domainMeta(true)
                .pipe(
                    untilDestroyed(this),
                    // Store the domain and the user
                    tap(meta => {
                        this.domainMeta = meta;
                        // If the user is not a moderator, disable the status filter
                        Utils.enableControls(
                            this.domainMeta?.canModerateDomain,
                            this.filterForm.controls.approved,
                            this.filterForm.controls.pending,
                            this.filterForm.controls.rejected,
                            this.filterForm.controls.deleted);
                    })),
            // Subscribe to sort changes
            this.sort.changes,
            // Subscribe to filter changes
            this.filterForm.valueChanges.pipe(untilDestroyed(this), debounceTime(500), distinctUntilChanged()))
            .pipe(
                // Map any of the above to true (= reset)
                map(() => true),
                // Subscribe to load requests
                mergeWith(this.loadMore),
                // Reset the content/page if needed
                tap(reset => {
                    if (reset) {
                        this.comments = undefined;
                        this.commenters.clear();
                        this.loadedPageNum = 0;
                    }
                }),
                // Nothing can be loaded unless a domain is selected
                filter(() => !!this.domainMeta?.domain),
                // Load the comment list
                switchMap(() => {
                    const f = this.filterForm.value;
                    const isMod = !!this.domainMeta?.canModerateDomain;
                    return this.api.commentList(
                            this.domainMeta!.domain!.id!,
                            this.pageId(),
                            // If no user explicitly provided and the current user isn't a moderator, limit the comment
                            // list to their comments only
                            this.userId() || (isMod ? undefined : this.domainMeta?.principal?.id),
                            !isMod || f.approved,
                            !isMod || f.pending,
                            !isMod || f.rejected,
                            !isMod || f.deleted,
                            f.filter,
                            ++this.loadedPageNum,
                            this.sort.property as any,
                            this.sort.descending)
                        .pipe(this.commentsLoading.processing());
                }))
            .subscribe(r => {
                this.comments = [...this.comments || [], ...r.comments || []];
                this.canLoadMore = this.configSvc.canLoadMore(r.comments);

                // Make a map of user ID => commenter
                r.commenters?.forEach(cr => this.commenters.set(cr.id!, cr));

                // Persist view settings
                this.localSettingSvc.storeValue<SortableViewSettings>('commentList', {sort: this.sort.asString});
            });
    }
}
