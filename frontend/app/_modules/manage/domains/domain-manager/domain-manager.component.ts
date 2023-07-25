import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder } from '@angular/forms';
import { debounceTime, distinctUntilChanged, merge, mergeWith, of, Subject, switchMap, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { faCheck, faPlus } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiGeneralService, Domain, DomainUser } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Paths } from '../../../../_utils/consts';
import { DomainSelectorService } from '../../_services/domain-selector.service';
import { ConfigService } from '../../../../_services/config.service';
import { Sort } from '../../_models/sort';

@UntilDestroy()
@Component({
    selector: 'app-domain-manager',
    templateUrl: './domain-manager.component.html',
})
export class DomainManagerComponent implements OnInit {

    /** Loaded list of domains. */
    domains?: Domain[];

    /** Domain currently selected in domain selector. */
    domain?: Domain;

    /** Whether there are more results to load. */
    canLoadMore = true;

    /** Map that connects domain IDs to domain users. */
    readonly domainUsers = new Map<string, DomainUser>();

    /** Observable triggering a data load, while indicating whether a result reset is needed. */
    readonly load = new Subject<boolean>();

    readonly sort = new Sort('host');
    readonly domainsLoading = new ProcessingStatus();
    readonly Paths = Paths;

    readonly filterForm = this.fb.nonNullable.group({
        filter: '',
    });

    // Icons
    readonly faCheck = faCheck;
    readonly faPlus  = faPlus;

    private loadedPageNum = 0;

    constructor(
        private readonly fb: FormBuilder,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly configSvc: ConfigService,
    ) {
        this.domainSelectorSvc.domainMeta
            .pipe(untilDestroyed(this))
            .subscribe(meta => this.domain = meta.domain);
    }

    get canAdd(): boolean {
        return true; // TODO Allow to all for now
    }

    get ctlFilterFilter(): AbstractControl<string> {
        return this.filterForm.get('filter')!;
    }

    ngOnInit(): void {
        merge(
                // Trigger an initial load
                of(undefined),
                // Subscribe to sort changes
                this.sort.changes.pipe(untilDestroyed(this)),
                // Subscribe to filter changes
                this.ctlFilterFilter.valueChanges.pipe(untilDestroyed(this), debounceTime(500), distinctUntilChanged()))
            .pipe(
                // Map any of the above to true (= reset)
                map(() => true),
                // Subscribe to load requests
                mergeWith(this.load),
                // Reset the content/page if needed
                tap(reset => {
                    if (reset) {
                        this.domains = undefined;
                        this.domainUsers.clear();
                        this.loadedPageNum = 0;
                    }
                }),
                // Load the domain list
                switchMap(() =>
                    this.api.domainList(this.ctlFilterFilter.value, ++this.loadedPageNum, this.sort.property as any, this.sort.descending)
                        .pipe(this.domainsLoading.processing())))
            .subscribe(r => {
                this.domains = [...this.domains || [], ...r.domains || []];
                this.canLoadMore = this.configSvc.canLoadMore(r.domains);

                // Make a map of domain ID => domain users
                r.domainUsers?.forEach(du => this.domainUsers.set(du.domainId!, du));
            });
    }
}
