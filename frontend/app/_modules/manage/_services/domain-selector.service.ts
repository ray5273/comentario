import { Injectable } from '@angular/core';
import { HttpContext } from "@angular/common/http";
import { BehaviorSubject, combineLatestWith, Observable } from 'rxjs';
import { ApiGeneralService, Domain, FederatedIdpId } from '../../../../generated-api';
import { LocalSettingService } from '../../../_services/local-setting.service';
import { AuthService } from '../../../_services/auth.service';
import { HTTP_ERROR_HANDLING } from "../../../_services/http-interceptor.service";
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

interface DomainSelectorSettings {
    domainId?: string;
}

export interface DomainWithIdps {
    domain:          Domain;
    federatedIdpIds: FederatedIdpId[];
}

@UntilDestroy()
@Injectable()
export class DomainSelectorService {

    /** Observable to get notifications about selected domain changes. */
    readonly domain: Observable<Domain | undefined> = new BehaviorSubject<Domain | undefined>(undefined);

    /** Observable to get notifications about selected domain and IdP changes. */
    readonly domainWithIdps: Observable<DomainWithIdps | undefined> = new BehaviorSubject<DomainWithIdps | undefined>(undefined);

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
            .pipe(untilDestroyed(this), combineLatestWith(this.reload$))
            // If the user is not logged in, reset any selection. Ignore any occurring errors as this is an induced
            // change
            .subscribe(([p]) => this.setDomainId(p ? this.lastId : undefined, true, false));
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
        // Don't bother if the ID isn't changing, unless force is true
        if (!force && this.lastId === id) {
            return;
        }
        this.lastId = id;

        // Remove any selection if there's no ID
        if (!id) {
            this.setDomain(undefined);
            return;
        }

        // Load domain and IdPs from the backend. Silently ignore possible errors during domain fetching
        this.api.domainGet(id, undefined, undefined, {context: new HttpContext().set(HTTP_ERROR_HANDLING, errorHandling)})
            .subscribe({
                next:  r => this.setDomain(r as DomainWithIdps),
                error: () => this.setDomain(undefined),
            });
    }


    /**
     * Select domain by providing the domain instance and its federated IdP IDs.
     */
    private setDomain(v: DomainWithIdps | undefined) {
        // Notify the subscribers
        (this.domain as BehaviorSubject<Domain | undefined>).next(v?.domain);
        (this.domainWithIdps as BehaviorSubject<DomainWithIdps | undefined>).next(v);

        // Store the last used domainId
        this.localSettingSvc.storeValue<DomainSelectorSettings>('domainSelector', {domainId: v?.domain?.id});
    }
}
