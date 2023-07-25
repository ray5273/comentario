import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { debounceTime, distinctUntilChanged, merge, mergeWith, Subject, switchMap, tap } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faLightbulb, faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, DomainPage } from '../../../../../generated-api';
import { Sort } from '../../_models/sort';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';
import { ConfigService } from '../../../../_services/config.service';

@UntilDestroy()
@Component({
    selector: 'app-page-manager',
    templateUrl: './page-manager.component.html',
})
export class PageManagerComponent implements OnInit {

    /** Domain/user metadata. */
    domainMeta?: DomainMeta;

    /** Loaded list of domain pages. */
    pages?: DomainPage[];

    /** Whether there are more results to load. */
    canLoadMore = true;

    /** Observable triggering a data load, while indicating whether a result reset is needed. */
    readonly load = new Subject<boolean>();

    readonly sort = new Sort('path');
    readonly pagesLoading = new ProcessingStatus();

    readonly filterForm = this.fb.nonNullable.group({
        filter: '',
    });

    // Icons
    readonly faLightbulb         = faLightbulb;
    readonly faUpRightFromSquare = faUpRightFromSquare;

    private loadedPageNum = 0;

    constructor(
        private readonly fb: FormBuilder,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly configSvc: ConfigService,
    ) {}

    ngOnInit(): void {
        merge(
                // Subscribe to domain changes. This will also trigger an initial load
                this.domainSelectorSvc.domainMeta
                    .pipe(
                        untilDestroyed(this),
                        tap(meta => this.domainMeta = meta)),
                // Subscribe to sort changes
                this.sort.changes.pipe(untilDestroyed(this)),
                // Subscribe to filter changes
                this.filterForm.valueChanges.pipe(untilDestroyed(this), debounceTime(500), distinctUntilChanged()))
            .pipe(
                // Map any of the above to true (= reset)
                map(() => true),
                // Subscribe to load requests
                mergeWith(this.load),
                // Reset the content/page if needed
                tap(reset => {
                    if (reset) {
                        this.pages = undefined;
                        this.loadedPageNum = 0;
                    }
                }),
                // Nothing can be loaded unless a domain is selected
                filter(() => !!this.domainMeta?.domain),
                // Load the page list
                switchMap(() =>
                    this.api.domainPageList(
                            this.domainMeta!.domain!.id!,
                            this.filterForm.controls.filter.value,
                            ++this.loadedPageNum,
                            this.sort.property as any,
                            this.sort.descending)
                        .pipe(this.pagesLoading.processing())))
            .subscribe(r => {
                this.pages = [...this.pages || [], ...r.pages || []];
                this.canLoadMore = this.configSvc.canLoadMore(r.pages);
            });
    }
}
