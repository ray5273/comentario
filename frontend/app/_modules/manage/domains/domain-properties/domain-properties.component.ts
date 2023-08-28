import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { faCopy, faEdit, faTicket } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FederatedIdentityProvider } from '../../../../../generated-api';
import { ConfigService } from '../../../../_services/config.service';
import { Paths } from '../../../../_utils/consts';
import { DocsService } from '../../../../_services/docs.service';
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

    readonly Paths = Paths;
    readonly snippet =
        `<script defer src="${Location.joinWithSlash(this.cfgSvc.staticConfig.baseUrl, 'comentario.js')}"></script>\n` +
        `<comentario-comments></comentario-comments>`;
    readonly installDocsUrl = this.docsSvc.getPageUrl('getting-started/');

    // Icons
    readonly faCopy   = faCopy;
    readonly faEdit   = faEdit;
    readonly faTicket = faTicket;

    constructor(
        private readonly cfgSvc: ConfigService,
        private readonly docsSvc: DocsService,
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
        this.domainSelectorSvc.domainMeta
            .pipe(untilDestroyed(this))
            .subscribe(meta => {
                this.domainMeta = meta;
                // Only add those federated identity providers available globally
                this.fedIdps = this.cfgSvc.staticConfig.federatedIdps?.filter(idp => meta.federatedIdpIds?.includes(idp.id));
            });
    }
}
