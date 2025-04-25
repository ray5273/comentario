import { Injectable } from '@angular/core';
import { HttpContext } from '@angular/common/http';
import { BehaviorSubject, combineLatestWith, Observable, tap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiGeneralService, Domain, DomainExtension, DomainGet200Response, DomainUser, DomainUserRole, Principal } from '../../../../generated-api';
import { LocalSettingService } from '../../../_services/local-setting.service';
import { HTTP_ERROR_HANDLING } from '../../../_services/http-error-handler.interceptor';
import { ProcessingStatus } from '../../../_utils/processing-status';
import { DynamicConfig } from '../../../_models/config';
import { Utils } from '../../../_utils/utils';
import { PrincipalService } from '../../../_services/principal.service';

interface DomainSelectorSettings {
    domainId?: string;
}

/** Kind of the current user in relation to a domain. */
export type DomainUserKind = 'superuser' | DomainUserRole;

// An object that combines domain, user, and IdP data
export class DomainMeta {

    /** Kind of the current user in relation to the domain. */
    readonly userKind?: DomainUserKind;

    /** Whether the current user is allowed to manage the domain, i.e. it's a superuser or a domain owner. */
    readonly canManageDomain: boolean;

    /** Whether the current user is allowed to moderate the domain, i.e. it's a superuser, domain owner, or domain moderator. */
    readonly canModerateDomain: boolean;

    constructor(
        /** Selected domain. */
        readonly domain?: Domain,
        /** Domain user corresponding to the currently authenticated principal. */
        readonly domainUser?: DomainUser,
        /** Domain dynamic configuration. */
        readonly config?: DynamicConfig,
        /** List of federated IdP IDs enabled for the domain. */
        readonly federatedIdpIds?: string[],
        /** List of extensions enabled for the domain. */
        readonly extensions?: DomainExtension[],
        /** Domain attributes (superuser only). */
        readonly attributes?: Record<string, string>,
        /** Authenticated principal, if any. */
        readonly principal?: Principal,
        /** Timestamp of the last time the principal was updated (fetched or reset). */
        readonly principalUpdated?: number,
    ) {
        // Calculate additional properties
        this.userKind = principal?.isSuperuser ? 'superuser' : domainUser?.role;
        this.canManageDomain = !!(domain && (this.userKind === 'superuser' || this.userKind === DomainUserRole.Owner));
        this.canModerateDomain = this.canManageDomain || this.userKind === DomainUserRole.Moderator;
    }
}

@UntilDestroy()
@Injectable()
export class DomainSelectorService {

    /** Domain loading status. */
    readonly domainLoading = new ProcessingStatus();

    private lastId?: string;
    private lastPrincipal?: Principal;
    private principal?: Principal;
    private readonly reload$ = new BehaviorSubject<void>(undefined);
    private readonly domainMeta$ = new BehaviorSubject<DomainMeta | undefined>(undefined);

    constructor(
        private readonly principalSvc: PrincipalService,
        private readonly api: ApiGeneralService,
        private readonly localSettingSvc: LocalSettingService,
    ) {
        // Restore the last saved domain, if any
        const settings = this.localSettingSvc.restoreValue<DomainSelectorSettings>('domainSelector');
        if (settings) {
            this.lastId = settings.domainId;
        }

        // Subscribe to authentication status changes
        this.principalSvc.principal$
            .pipe(
                untilDestroyed(this),
                // Store the current principal
                tap(p => this.principal = p),
                // Update whenever reload signal is emitted
                combineLatestWith(this.reload$))
            // If the user is not logged in, reset any selection. Ignore any occurring errors as this is an induced
            // change
            .subscribe(([p]) => this.setDomainId(p ? this.lastId : undefined, true, false));
    }

    /**
     * Observable to get combined notifications about selected domain and/or current user changes.
     * @param requirePrincipal When true, the observable will error if the current user is not authenticated (important
     * for observables that trigger downstream HTTP requests, which can lead to principal updates after a 401 error and
     * thus to infinite loops). When false, emits meta.principal === undefined in that case.
     */
    domainMeta(requirePrincipal: boolean): Observable<DomainMeta> {
        return this.domainMeta$
            .pipe(
                // Withhold undefined (=indeterminate) values
                filter((meta): meta is DomainMeta => meta !== undefined),
                // Enforce the principal if needed
                tap(meta => {
                    if (requirePrincipal && !meta.principal) {
                        throw new Error('Not authenticated');
                    }
                }));
    }

    /**
     * Reload the currently selected domain, if any.
     */
    reload() {
        this.reload$.next();
    }

    /**
     * Select domain by its ID.
     * @param id UUID of the domain to activate, or undefined to remove selection.
     * @param force Whether to force-update the domain even if ID didn't change.
     * @param errorHandling Whether to engage standard HTTP error handling.
     */
    setDomainId(id: string | undefined, force = false, errorHandling = true): void {
        // Don't bother if the ID/principal aren't changing, unless force is true
        if (!force && this.lastId === id && this.lastPrincipal === this.principal) {
            return;
        }

        // Store the last used values
        this.lastId = id;
        this.lastPrincipal = this.principal;

        // Remove any selection if there's no ID
        if (!id) {
            this.setDomain(undefined);
            return;
        }

        // Put the current metadata into an indeterminate state
        this.domainMeta$.next(undefined);

        // Load domain and IdPs from the backend. Silently ignore possible errors during domain fetching
        this.api.domainGet(id, undefined, undefined, {context: new HttpContext().set(HTTP_ERROR_HANDLING, errorHandling)})
            .pipe(this.domainLoading.processing())
            .subscribe({
                next:  r => this.setDomain(r),
                error: () => this.setDomain(undefined),
            });
    }


    /**
     * Select domain by providing the domain instance and its federated IdP IDs.
     */
    private setDomain(v: DomainGet200Response | undefined) {
        // Notify the subscribers
        this.domainMeta$.next(new DomainMeta(
            v?.domain,
            v?.domainUser,
            v?.configuration ? new DynamicConfig(v.configuration) : undefined,
            v?.federatedIdpIds,
            v?.extensions,
            Utils.sortByKey(v?.attributes) as Record<string, string> | undefined,
            this.principal,
            this.principalSvc.updatedTime()));

        // Store the last used domainId
        this.localSettingSvc.storeValue<DomainSelectorSettings>('domainSelector', {domainId: v?.domain?.id});
    }
}
