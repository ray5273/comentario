import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, merge, mergeWith, Subject, switchMap, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBan, faLock, faUserLock } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, User } from '../../../../../generated-api';
import { Sort } from '../../_models/sort';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ConfigService } from '../../../../_services/config.service';
import { Animations } from '../../../../_utils/animations';
import { InfoBlockComponent } from '../../../tools/info-block/info-block.component';
import { SortSelectorComponent } from '../../sort-selector/sort-selector.component';
import { SortPropertyComponent } from '../../sort-selector/sort-property/sort-property.component';
import { UserAvatarComponent } from '../../../tools/user-avatar/user-avatar.component';
import { SuperuserBadgeComponent } from '../../badges/superuser-badge/superuser-badge.component';
import { CurrentUserBadgeComponent } from '../../badges/current-user-badge/current-user-badge.component';
import { IdentityProviderIconComponent } from '../../../tools/identity-provider-icon/identity-provider-icon.component';
import { ListFooterComponent } from '../../../tools/list-footer/list-footer.component';
import { LoaderDirective } from '../../../tools/_directives/loader.directive';
import { DecimalPipe } from '@angular/common';
import { LocalSettingService } from '../../../../_services/local-setting.service';
import { SortableViewSettings } from '../../_models/view';

@UntilDestroy()
@Component({
    selector: 'app-user-manager',
    templateUrl: './user-manager.component.html',
    animations: [Animations.fadeIn('slow')],
    imports: [
        InfoBlockComponent,
        SortSelectorComponent,
        SortPropertyComponent,
        ReactiveFormsModule,
        RouterLink,
        UserAvatarComponent,
        FaIconComponent,
        SuperuserBadgeComponent,
        CurrentUserBadgeComponent,
        IdentityProviderIconComponent,
        ListFooterComponent,
        LoaderDirective,
        DecimalPipe,
    ],
})
export class UserManagerComponent implements OnInit {

    /** Loaded list of users. */
    users?: User[];

    /** Whether there are more results to load. */
    canLoadMore = true;

    /** Observable triggering a data load, while indicating whether a result reset is needed. */
    readonly load = new Subject<boolean>();

    readonly sort = new Sort(['email', 'name', 'created', 'federatedIdP'], 'email', false);
    readonly usersLoading = new ProcessingStatus();
    readonly filterForm = this.fb.nonNullable.group({
        filter: '',
    });

    // Icons
    readonly faBan      = faBan;
    readonly faLock     = faLock;
    readonly faUserLock = faUserLock;

    private loadedPageNum = 0;

    constructor(
        private readonly fb: FormBuilder,
        private readonly api: ApiGeneralService,
        private readonly configSvc: ConfigService,
        private readonly localSettingSvc: LocalSettingService,
    ) {
        // Restore the view settings
        localSettingSvc.load<SortableViewSettings>('userManager').subscribe(s => s?.sort && (this.sort.asString = s.sort));
    }

    ngOnInit(): void {
        // Subscribe to sort/filter changes
        merge(
                this.sort.changes,
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

                // Persist view settings
                this.localSettingSvc.storeValue<SortableViewSettings>('userManager', {sort: this.sort.asString});
            });

        // Trigger an initial load
        this.load.next(true);
    }
}
