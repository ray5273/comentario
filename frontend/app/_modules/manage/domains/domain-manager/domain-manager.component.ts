import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder } from '@angular/forms';
import { debounceTime, distinctUntilChanged, merge } from 'rxjs';
import { faCheckDouble, faPlus } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {ApiGeneralService, Domain, DomainUser} from '../../../../../generated-api';
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

    readonly sort = new Sort('host');
    readonly domainsLoading = new ProcessingStatus();
    readonly Paths = Paths;

    readonly filterForm = this.fb.nonNullable.group({
        filter: '',
    });

    // Icons
    readonly faCheckDouble = faCheckDouble;
    readonly faPlus        = faPlus;

    private loadedPageNum = 0;

    constructor(
        private readonly fb: FormBuilder,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly configSvc: ConfigService,
    ) {
        this.domainSelectorSvc.domain.pipe(untilDestroyed(this)).subscribe(d => this.domain = d);
    }

    get canAdd(): boolean {
        return true; // TODO Allow to all for now
    }

    get ctlFilterFilter(): AbstractControl<string> {
        return this.filterForm.get('filter')!;
    }

    ngOnInit(): void {
        // Load domain list
        this.load(true);

        // Subscribe to sort/filter changes
        merge(
                this.sort.changes,
                this.ctlFilterFilter.valueChanges.pipe(debounceTime(500), distinctUntilChanged()))
            .subscribe(() => this.load(true));
    }

    unselect() {
        this.domainSelectorSvc.setDomainId(undefined);
    }

    load(reset: boolean) {
        // Reset the content/page if needed
        if (reset) {
            this.domains = undefined;
            this.domainUsers.clear();
            this.loadedPageNum = 0;
        }

        // Load the domain list
        this.api.domainList(this.ctlFilterFilter.value, ++this.loadedPageNum, this.sort.property as any, this.sort.descending)
            .pipe(this.domainsLoading.processing())
            .subscribe(r => {
                this.domains = [...this.domains || [], ...r.domains || []];
                this.canLoadMore = this.configSvc.canLoadMore(r.domains);

                // Make a map of domain ID => domain users
                r.domainUsers?.forEach(du => this.domainUsers.set(du.domainId!, du));
            });
    }
}
