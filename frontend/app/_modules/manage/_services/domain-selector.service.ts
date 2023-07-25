import { Injectable } from '@angular/core';
import { HttpContext } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatestWith, Observable, ReplaySubject, tap } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiGeneralService, Domain, DomainUser, FederatedIdpId, Principal } from '../../../../generated-api';
import { LocalSettingService } from '../../../_services/local-setting.service';
import { AuthService } from '../../../_services/auth.service';
import { HTTP_ERROR_HANDLING } from '../../../_services/http-interceptor.service';

interface DomainSelectorSettings {
    domainId?: string;
}

/** Kind of the current user in relation to a domain. */
export type DomainUserKind = 'superuser' | 'owner' | 'moderator' | 'commenter' | 'readonly';

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
        /** List of federated IdP IDs enabled for the domain. */
        readonly federatedIdpIds?: FederatedIdpId[],
        /** Authenticated principal, if any. */
        readonly principal?: Principal,
    ) {
        // Calculate additional properties
        if (domainUser && principal) {
            if (principal.isSuperuser) {
                this.userKind = 'superuser';
            } else if (domainUser.isOwner) {
                this.userKind = 'owner';
            } else if (domainUser.isModerator) {
                this.userKind = 'moderator';
            } else if (domainUser.isCommenter) {
                this.userKind = 'commenter';
            } else {
                this.userKind = 'readonly';
            }
        }
        this.canManageDomain = !!(domain && (principal?.isSuperuser || domainUser?.isOwner));
        this.canModerateDomain = this.canManageDomain || !!(domain && domainUser?.isModerator);
    }
}

@UntilDestroy()
@Injectable()
export class DomainSelectorService {

    /** Observable to get notifications about selected domain and current user changes. */
    readonly domainMeta: Observable<DomainMeta> = new ReplaySubject<DomainMeta>(1);

    private lastId?: string;
    private lastPrincipal?: Principal;
    private principal?: Principal;
    private readonly reload$ = new BehaviorSubject<void>(undefined);

    constructor(
        private readonly authSvc: AuthService,
        private readonly api: ApiGeneralService,
        private readonly localSettingSvc: LocalSettingService,
    ) {
        // Restore the last saved domain, if any
        const settings = this.localSettingSvc.restoreValue<DomainSelectorSettings>('domainSelector');
        if (settings) {
            this.lastId = settings.domainId;
        }

        // Subscribe to authentication status changes
        this.authSvc.principal
            .pipe(
                untilDestroyed(this),
                // Store the current principal
                tap(p => this.principal = p ?? undefined),
                // Update whenever reload signal is emitted
                combineLatestWith(this.reload$))
            // If the user is not logged in, reset any selection. Ignore any occurring errors as this is an induced
            // change
            .subscribe(([p]) => this.setDomainId(p ? this.lastId : undefined, true, false));
    }

    /**
     * Subscribe to the given route parameter (specifying the domain ID) and automatically update the selected domain.
     * This method is meant to enforce consistent behaviour when hitting a route that includes domain ID, such that the
     * selected domain always matches the route.
     * @param component Component whose lifecycle defines the existence of the subscription. Must have the @UntilDestroy decorator applied.
     * @param route Route providing parameter.
     * @param name Name of the parameter containing domain ID.
     */
    monitorRouteParam(component: any, route: ActivatedRoute, name: string) {
        route.paramMap
            .pipe(untilDestroyed(component))
            .subscribe(pm => this.setDomainId(pm.get(name) || undefined));
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
    setDomainId(id: string | undefined, force = false, errorHandling = true) {
        // Don't bother if the ID/principal aren't changing, unless force is true
        if (!force && this.lastId === id && this.lastPrincipal === this.principal) {
            return;
        }
        this.lastId = id;
        this.lastPrincipal = this.principal;

        // Remove any selection if there's no ID
        if (!id) {
            this.setDomain(undefined);
            return;
        }

        // Load domain and IdPs from the backend. Silently ignore possible errors during domain fetching
        this.api.domainGet(id, undefined, undefined, {context: new HttpContext().set(HTTP_ERROR_HANDLING, errorHandling)})
            .subscribe({
                next:  r => this.setDomain(r),
                error: () => this.setDomain(undefined),
            });
    }


    /**
     * Select domain by providing the domain instance and its federated IdP IDs.
     */
    private setDomain(v: { domain?: Domain; domainUser?: DomainUser; federatedIdpIds?: Array<FederatedIdpId> } | undefined) {
        // Notify the subscribers
        (this.domainMeta as ReplaySubject<DomainMeta>)
            .next(new DomainMeta(v?.domain, v?.domainUser, v?.federatedIdpIds, this.principal));

        // Store the last used domainId
        this.localSettingSvc.storeValue<DomainSelectorSettings>('domainSelector', {domainId: v?.domain?.id});
    }
}
