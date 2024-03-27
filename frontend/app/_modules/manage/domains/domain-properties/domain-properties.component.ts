import { Component, OnInit } from '@angular/core';
import { combineLatestWith, first } from 'rxjs';
import { faEdit, faTicket } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DomainExtension, FederatedIdentityProvider } from '../../../../../generated-api';
import { ConfigService } from '../../../../_services/config.service';
import { Paths } from '../../../../_utils/consts';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';

@UntilDestroy()
@Component({
    selector: 'app-domain-properties',
    templateUrl: './domain-properties.component.html',
})
export class DomainPropertiesComponent implements OnInit {

    /** Domain/user metadata. */
    domainMeta?: DomainMeta;

    /** List of federated identity providers configured in the domain. */
    fedIdps?: FederatedIdentityProvider[];

    /** List of extensions enabled in the domain. */
    extensions?: DomainExtension[];

    readonly domainLoading = this.domainSelectorSvc.domainLoading;
    readonly Paths = Paths;

    // Icons
    readonly faEdit   = faEdit;
    readonly faTicket = faTicket;

    constructor(
        private readonly cfgSvc: ConfigService,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}

    /**
     * Whether any specific moderator approval policy is in place.
     */
    get hasApprovalPolicy(): boolean {
        const d = this.domainMeta?.domain;
        return !!d && !!(
            d.modAnonymous ||
            d.modAuthenticated ||
            d.modNumComments ||
            d.modUserAgeDays ||
            d.modImages ||
            d.modLinks);
    }

    ngOnInit(): void {
        // Subscribe to domain changes to obtain domain and IdP data
        this.domainSelectorSvc.domainMeta(true)
            .pipe(
                untilDestroyed(this),
                combineLatestWith(this.cfgSvc.extensions.pipe(first())))
            .subscribe(([meta, exts]) => {
                this.domainMeta = meta;
                // Only add those federated identity providers available globally
                this.fedIdps = this.cfgSvc.staticConfig.federatedIdps?.filter(idp => meta.federatedIdpIds?.includes(idp.id));
                // Only add those extensions available globally
                this.extensions = exts?.filter(ex => meta.extensions?.some(me => me.id === ex.id));
            });
    }
}
