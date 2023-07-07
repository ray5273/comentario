import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder } from '@angular/forms';
import { debounceTime, distinctUntilChanged, merge, tap } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiGeneralService, Domain, Comment, Commenter } from '../../../../../generated-api';
import { DomainSelectorService } from '../../_services/domain-selector.service';
import { ConfigService } from '../../../../_services/config.service';
import { Sort } from '../../_models/sort';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { faUser } from '@fortawesome/free-solid-svg-icons';

@UntilDestroy()
@Component({
    selector: 'app-comment-list',
    templateUrl: './comment-list.component.html',
})
export class CommentListComponent implements OnInit {

    /**
     * Optional page ID to load comments for. If not provided, all comments for the current domain will be loaded.
     */
    @Input()
    pageId?: string;

    /** Domain currently selected in domain selector. */
    domain?: Domain;

    /** Loaded list of comments. */
    comments?: Comment[];

    /** Whether there are more results to load. */
    canLoadMore = true;

    /** Loaded commenters. */
    readonly commenters = new Map<string, Commenter>();

    readonly sort = new Sort('created', true);
    readonly commentsLoading = new ProcessingStatus();

    readonly filterForm = this.fb.nonNullable.group({
        filter: '',
    });

    // Icons
    readonly faUser = faUser;

    private loadedPageNum = 0;

    constructor(
        private readonly fb: FormBuilder,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly configSvc: ConfigService,
    ) {}

    get ctlFilterFilter(): AbstractControl<string> {
        return this.filterForm.get('filter')!;
    }

    ngOnInit(): void {
        // Load comment list
        this.load(true);

        // Subscribe to sort/filter changes
        merge(
            this.domainSelectorSvc.domain.pipe(untilDestroyed(this), tap(d => this.domain = d)),
            this.sort.changes.pipe(untilDestroyed(this)),
            this.ctlFilterFilter.valueChanges.pipe(untilDestroyed(this), debounceTime(500), distinctUntilChanged()))
            .subscribe(() => this.load(true));
    }

    load(reset: boolean) {
        // Reset the content if needed
        if (reset || !this.domain) {
            this.comments = undefined;
            this.commenters.clear();
            this.loadedPageNum = 0;

            // Nothing can be loaded unless a domain is selected
            if (!this.domain) {
                return;
            }
        }

        // Load the domain list
        this.api.commentList(this.domain.id!, this.pageId, this.ctlFilterFilter.value, ++this.loadedPageNum, this.sort.property as any, this.sort.descending)
            .pipe(this.commentsLoading.processing())
            .subscribe(r => {
                this.comments = [...this.comments || [], ...r.comments || []];
                this.canLoadMore = this.configSvc.canLoadMore(r.comments);

                // Make a map of user ID => commenter
                r.commenters?.forEach(cr => this.commenters.set(cr.id!, cr));
            });
    }
}
