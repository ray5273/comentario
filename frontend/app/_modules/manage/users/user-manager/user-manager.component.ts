import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder } from '@angular/forms';
import { debounceTime, distinctUntilChanged, merge, mergeWith, Subject, switchMap, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiGeneralService, Domain, User } from '../../../../../generated-api';
import { Sort } from '../../_models/sort';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { DomainSelectorService } from '../../_services/domain-selector.service';
import { ConfigService } from '../../../../_services/config.service';

@UntilDestroy()
@Component({
    selector: 'app-user-manager',
    templateUrl: './user-manager.component.html',
})
export class UserManagerComponent implements OnInit {

    /** Domain currently selected in domain selector. */
    domain?: Domain;

    /** Loaded list of users. */
    users?: User[];

    /** Whether there are more results to load. */
    canLoadMore = true;

    /** Observable triggering a data load, while indicating whether a result reset is needed. */
    readonly load = new Subject<boolean>();

    readonly sort = new Sort('email');
    readonly usersLoading = new ProcessingStatus();
    readonly filterForm = this.fb.nonNullable.group({
        filter: '',
    });

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
        merge(
                // Subscribe to domain changes. This will also trigger an initial load
                this.domainSelectorSvc.domain.pipe(untilDestroyed(this), tap(d => this.domain = d)),
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
                tap(reset => reset && (this.users = undefined) && (this.loadedPageNum = 0)),
                // Load the domain list
                switchMap(() =>
                    this.api.userList(
                        this.domain?.id,
                        this.ctlFilterFilter.value,
                        ++this.loadedPageNum,
                        this.sort.property as any,
                        this.sort.descending)
                    .pipe(this.usersLoading.processing())))
            .subscribe(r => {
                this.users = [...this.users || [], ...r.users || []];
                this.canLoadMore = this.configSvc.canLoadMore(r.users);
            });
    }
}
