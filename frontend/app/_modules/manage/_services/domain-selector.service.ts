import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatestWith } from 'rxjs';
import { ApiGeneralService, Domain } from '../../../../generated-api';
import { LocalSettingService } from '../../../_services/local-setting.service';
import { AuthService } from '../../../_services/auth.service';

interface DomainSelectorSettings {
    domainId?: string;
}

@Injectable()
export class DomainSelectorService {

    /** Observable to get notifications about selected domain changes. */
    readonly domain = new BehaviorSubject<Domain | undefined>(undefined);

    /** Observable to get notifications about selected domain IdP changes. */
    readonly federatedIdpIds = new BehaviorSubject<string[] | undefined>(undefined);

    private lastId?: string;
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
            // Update whenever reload signal is emitted
            .pipe(combineLatestWith(this.reload$))
            // If the user is not logged in, reset any selection
            .subscribe(([p]) => this.setDomainId(p ? this.lastId : undefined, true));
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
     */
    setDomainId(id: string | undefined, force: boolean) {
        // Don't bother if the ID isn't changing, unless force is true
        if (!force && this.lastId === id) {
            return;
        }
        this.lastId = id;

        // Remove any selection if there's no ID
        if (!id) {
            this.unselect();
            return;
        }

        // Load domain and IdPs from the backend
        this.api.domainGet(id).subscribe({
            next:  r => this.setDomain(r.domain, r.federatedIdpIds),
            error: () => this.unselect(),
        });
    }


    /**
     * Select domain by providing the domain instance and its federated IdP IDs.
     * @param d Domain instance.
     * @param fedIdps Array of federated IdP IDs enabled for the domain.
     */
    setDomain(d: Domain | undefined, fedIdps: string[] | undefined) {
        // Notify the subscribers
        this.domain.next(d);
        this.federatedIdpIds.next(fedIdps);

        // Store the last used domainId
        this.localSettingSvc.storeValue<DomainSelectorSettings>('domainSelector', {domainId: d?.id});
    }

    /**
     * Remove any active domain selection.
     */
    private unselect() {
        this.setDomain(undefined, undefined);
    }
}
