import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { faCopy, faEdit } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Domain, DomainUser, FederatedIdentityProvider, Principal } from '../../../../../generated-api';
import { ConfigService } from '../../../../_services/config.service';
import { Paths } from '../../../../_utils/consts';
import { DocsService } from '../../../../_services/docs.service';
import { DomainSelectorService } from '../../_services/domain-selector.service';

@UntilDestroy()
@Component({
    selector: 'app-domain-properties',
    templateUrl: './domain-properties.component.html',
})
export class DomainPropertiesComponent implements OnInit {

    /** Domain to display properties for. */
    domain?: Domain;

    /** Domain user corresponding to the current user. */
    domainUser?: DomainUser;

    /** List of federated identity providers configured in the domain. */
    fedIdps?: FederatedIdentityProvider[];

    /** Currently logged-in principal. */
    principal?: Principal;

    readonly Paths = Paths;
    readonly snippet =
        `<script defer src="${Location.joinWithSlash(this.cfgSvc.config.baseUrl, 'comentario.js')}"></script>\n` +
        `<div id="comentario"></div>`;
    readonly installDocsUrl = this.docsSvc.getPageUrl('getting-started/');

    // Icons
    readonly faCopy = faCopy;
    readonly faEdit = faEdit;

    constructor(
        private readonly route: ActivatedRoute,
        private readonly cfgSvc: ConfigService,
        private readonly docsSvc: DocsService,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {
        // Monitor the domain ID param in the route
        this.domainSelectorSvc.monitorRouteParam(this, this.route, 'id');
    }

    /**
     * Whether any specific moderator approval policy is in place.
     */
    get hasApprovalPolicy(): boolean {
        const d = this.domain;
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
        this.domainSelectorSvc.domainUserIdps
            .pipe(untilDestroyed(this))
            .subscribe(data => {
                this.domain = data.domain;
                this.domainUser = data.domainUser;
                // Only add those federated identity providers available globally
                this.fedIdps = this.cfgSvc.config.federatedIdps.filter(idp => data.federatedIdpIds?.includes(idp.id));
                this.principal = data.principal;
            });
    }
}
