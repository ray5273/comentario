import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder } from '@angular/forms';
import { debounceTime, distinctUntilChanged, merge, tap } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, Domain, DomainPage } from '../../../../../generated-api';
import { Sort } from '../../_models/sort';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { DomainSelectorService } from '../../_services/domain-selector.service';
import { ConfigService } from '../../../../_services/config.service';

@UntilDestroy()
@Component({
    selector: 'app-page-manager',
    templateUrl: './page-manager.component.html',
})
export class PageManagerComponent implements OnInit {

    /** Domain currently selected in domain selector. */
    domain?: Domain;

    /** Loaded list of domain pages. */
    pages?: DomainPage[];

    /** Whether there are more results to load. */
    canLoadMore = true;

    readonly sort = new Sort('path');
    readonly pagesLoading = new ProcessingStatus();

    readonly filterForm = this.fb.nonNullable.group({
        filter: '',
    });

    // Icons
    readonly faUpRightFromSquare = faUpRightFromSquare;

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
        // Load page list
        this.load(true);

        // Subscribe to sort/filter changes
        merge(
            this.domainSelectorSvc.domain.pipe(untilDestroyed(this), tap(d => this.domain = d)),
            this.sort.changes.pipe(untilDestroyed(this)),
            this.ctlFilterFilter.valueChanges.pipe(untilDestroyed(this), debounceTime(500), distinctUntilChanged()))
            .subscribe(() => this.load(true));
    }

    load(reset: boolean) {
        // Reset the content/page if needed
        if (reset || !this.domain) {
            this.pages = undefined;
            this.loadedPageNum = 0;

            // Nothing can be loaded unless a domain is selected
            if (!this.domain) {
                return;
            }
        }

        // Load the domain list
        this.api.domainPageList(this.domain.id!, this.ctlFilterFilter.value, ++this.loadedPageNum, this.sort.property as any, this.sort.descending)
            .pipe(this.pagesLoading.processing())
            .subscribe(r => {
                this.pages = [...this.pages || [], ...r.pages || []];
                this.canLoadMore = this.configSvc.canLoadMore(r.pages);
            });
    }
}
