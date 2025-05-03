import { Component, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, first, merge, mergeWith, of, Subject, switchMap, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faPlus } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiGeneralService, Domain, DomainUser } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Paths } from '../../../../_utils/consts';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';
import { ConfigService } from '../../../../_services/config.service';
import { Sort } from '../../_models/sort';
import { Animations } from '../../../../_utils/animations';
import { InstanceConfigItemKey } from '../../../../_models/config';
import { InfoBlockComponent } from '../../../tools/info-block/info-block.component';
import { SortSelectorComponent } from '../../sort-selector/sort-selector.component';
import { DomainUserRoleBadgeComponent } from '../../badges/domain-user-role-badge/domain-user-role-badge.component';
import { ListFooterComponent } from '../../../tools/list-footer/list-footer.component';
import { SortPropertyComponent } from '../../sort-selector/sort-property/sort-property.component';
import { LoaderDirective } from '../../../tools/_directives/loader.directive';
import { LocalSettingService } from '../../../../_services/local-setting.service';
import { SortableViewSettings } from '../../_models/view';

@UntilDestroy()
@Component({
    selector: 'app-domain-manager',
    templateUrl: './domain-manager.component.html',
    animations: [Animations.fadeIn('slow')],
    imports: [
        InfoBlockComponent,
        RouterLink,
        FaIconComponent,
        SortSelectorComponent,
        DomainUserRoleBadgeComponent,
        DecimalPipe,
        ListFooterComponent,
        SortPropertyComponent,
        ReactiveFormsModule,
        LoaderDirective,
    ],
})
export class DomainManagerComponent implements OnInit {

    /** Domain/user metadata. */
    domainMeta?: DomainMeta;

    /** Loaded list of domains. */
    domains?: Domain[];

    /** Whether there are more results to load. */
    canLoadMore = true;

    /** Whether the user is allowed to add a domain. */
    canAdd = false;

    /** Map that connects domain IDs to domain users. */
    readonly domainUsers = new Map<string, DomainUser>();

    /** Observable triggering a data load, while indicating whether a result reset is needed. */
    readonly load = new Subject<boolean>();

    readonly sort = new Sort(['name', 'host', 'created', 'countComments', 'countViews'], 'host', false);
    readonly domainsLoading = new ProcessingStatus();
    readonly domainLoading = this.domainSelectorSvc.domainLoading;
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
        private readonly localSettingSvc: LocalSettingService,
    ) {
        // Restore the view settings
        localSettingSvc.load<SortableViewSettings>('domainManager').subscribe(s => s?.sort && (this.sort.asString = s.sort));

        // Subscribe to domain selector changes
        this.domainSelectorSvc.domainMeta(true)
            .pipe(
                untilDestroyed(this),
                tap(meta => this.domainMeta = meta),
                // Find out whether the user is allowed to add a domain: if the user isn't a superuser and owns no
                // domains yet, check whether new owners are allowed
                switchMap(() => (this.domainMeta?.principal?.isSuperuser || this.domainMeta?.principal?.countDomainsOwned) ?
                    of(true) :
                    this.configSvc.dynamicConfig.pipe(
                        first(),
                        map(dc => dc.get(InstanceConfigItemKey.operationNewOwnerEnabled).val as boolean))))
            .subscribe(canAdd => this.canAdd = canAdd);
    }

    /**
     * Whether a filter is currently active.
     */
    get filterActive(): boolean {
        return this.filterForm.controls.filter.value.length > 0;
    }

    ngOnInit(): void {
        merge(
                // Trigger an initial load
                of(undefined),
                // Subscribe to sort changes
                this.sort.changes,
                // Subscribe to filter changes
                this.filterForm.controls.filter.valueChanges.pipe(untilDestroyed(this), debounceTime(500), distinctUntilChanged()))
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
                    this.api.domainList(
                            this.filterForm.controls.filter.value,
                            ++this.loadedPageNum,
                            this.sort.property as any,
                            this.sort.descending)
                        .pipe(this.domainsLoading.processing())))
            .subscribe(r => {
                this.domains ??= [];

                // Add all loaded domains
                if (r.domains) {
                    this.domains.push(...r.domains);
                }

                // If there's a selected domain, add it to the list
                const curDomain = this.domainMeta?.domain;
                if (curDomain) {
                    // If not in the search mode, or the current domain is on the list, insert it as the first item
                    if (!this.filterActive || this.domains.some(d => d.id === curDomain.id)) {
                        this.domains.splice(0, 0, curDomain);
                    }

                    // Make sure it isn't duplicated on the list
                    this.domains = this.domains.filter((d, i) => i === 0 || d.id !== curDomain.id);
                }

                this.canLoadMore = this.configSvc.canLoadMore(r.domains);

                // Make a map of domain ID => domain users
                r.domainUsers?.forEach(du => this.domainUsers.set(du.domainId!, du));

                // Persist view settings
                this.localSettingSvc.storeValue<SortableViewSettings>('domainManager', {sort: this.sort.asString});
            });
    }
}
