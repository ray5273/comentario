import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { debounceTime, distinctUntilChanged, merge, mergeWith, Subject, switchMap, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faBan, faLightbulb, faLock } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, User } from '../../../../../generated-api';
import { Sort } from '../../_models/sort';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ConfigService } from '../../../../_services/config.service';

@UntilDestroy()
@Component({
    selector: 'app-user-manager',
    templateUrl: './user-manager.component.html',
})
export class UserManagerComponent implements OnInit {

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

    // Icons
    readonly faBan       = faBan;
    readonly faLightbulb = faLightbulb;
    readonly faLock      = faLock;

    private loadedPageNum = 0;

    constructor(
        private readonly fb: FormBuilder,
        private readonly api: ApiGeneralService,
        private readonly configSvc: ConfigService,
    ) {}

    ngOnInit(): void {
        // Subscribe to sort/filter changes
        merge(
                this.sort.changes.pipe(untilDestroyed(this)),
                this.filterForm.controls.filter.valueChanges
                    .pipe(untilDestroyed(this), debounceTime(500), distinctUntilChanged()))
            .pipe(
                // Map any of the above to true (= reset)
                map(() => true),
                // Subscribe to load requests
                mergeWith(this.load),
                // Reset the content/page if needed
                tap(reset => {
                    if (reset) {
                        this.users = undefined;
                        this.loadedPageNum = 0;
                    }
                }),
                // Load the domain list
                switchMap(() =>
                    this.api.userList(
                        this.filterForm.controls.filter.value,
                        ++this.loadedPageNum,
                        this.sort.property as any,
                        this.sort.descending)
                    .pipe(this.usersLoading.processing())))
            .subscribe(r => {
                this.users = [...this.users || [], ...r.users || []];
                this.canLoadMore = this.configSvc.canLoadMore(r.users);
            });

        // Trigger an initial load
        this.load.next(true);
    }
}
