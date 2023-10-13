import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { debounceTime, distinctUntilChanged, merge, mergeWith, Subject, switchMap, tap } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faBan } from '@fortawesome/free-solid-svg-icons';
import { Sort } from '../../../_models/sort';
import { ApiGeneralService, DomainUser, User } from '../../../../../../generated-api';
import { DomainMeta, DomainSelectorService } from '../../../_services/domain-selector.service';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { ConfigService } from '../../../../../_services/config.service';
import { Animations } from '../../../../../_utils/animations';

@UntilDestroy()
@Component({
    selector: 'app-domain-user-manager',
    templateUrl: './domain-user-manager.component.html',
    animations: [Animations.fadeIn('slow')]
})
export class DomainUserManagerComponent implements OnInit {

    /** Domain/user metadata. */
    domainMeta?: DomainMeta;

    /** Loaded list of domain users. */
    domainUsers?: DomainUser[];

    /** Whether there are more results to load. */
    canLoadMore = true;

    /** Map of users for the loaded domain users. */
    readonly userMap = new Map<string, User>();

    /** Observable triggering a data load, while indicating whether a result reset is needed. */
    readonly load = new Subject<boolean>();

    readonly sort = new Sort('email');
    readonly loading = new ProcessingStatus();

    readonly filterForm = this.fb.nonNullable.group({
        filter: '',
    });

    private loadedPageNum = 0;

    // Icons
    readonly faBan = faBan;

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
                        this.domainUsers = undefined;
                        this.userMap.clear();
                        this.loadedPageNum = 0;
                    }
                }),
                // Nothing can be loaded unless a domain is selected
                filter(() => !!this.domainMeta?.domain),
                // Load the page list
                switchMap(() =>
                    this.api.domainUserList(
                        this.domainMeta!.domain!.id!,
                        this.filterForm.controls.filter.value,
                        ++this.loadedPageNum,
                        this.sort.property as any,
                        this.sort.descending)
                        .pipe(this.loading.processing())))
            .subscribe(r => {
                this.domainUsers = [...this.domainUsers || [], ...r.domainUsers || []];
                this.canLoadMore = this.configSvc.canLoadMore(r.domainUsers);

                // Make a map of user ID => user
                r.users?.forEach(u => this.userMap.set(u.id!, u));
            });
    }
}
