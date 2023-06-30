import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, tap } from "rxjs";
import { faChevronLeft, faCopy, faEdit } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Domain, FederatedIdentityProvider } from '../../../../../generated-api';
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

    domain?: Domain;
    fedIdps?: FederatedIdentityProvider[];

    readonly Paths = Paths;
    readonly snippet =
        `<script defer src="${Location.joinWithSlash(this.cfgSvc.config.baseUrl, 'comentario.js')}"></script>\n` +
        `<div id="comentario"></div>`;
    readonly installDocsUrl = this.docsSvc.getPageUrl('getting-started/');

    // Icons
    readonly faChevronLeft = faChevronLeft;
    readonly faCopy        = faCopy;
    readonly faEdit        = faEdit;

    constructor(
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly cfgSvc: ConfigService,
        private readonly docsSvc: DocsService,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}

    /**
     * Whether any specific moderator approval policy is in place.
     */
    get hasApprovalPolicy(): boolean {
        const d = this.domain;
        return !!d &&
            (!!d.modAnonymous ||
            !!d.modAuthenticated ||
            !!d.modNumComments ||
            !!d.modUserAgeDays ||
            !!d.modImages ||
            !!d.modLinks);
    }

    ngOnInit(): void {
        // Subscribe to route parameter changes to update domain selector
        this.route.paramMap
            .pipe(
                tap(pm => this.domainSelectorSvc.setDomainId(pm.get('id') || undefined)),
                // Subscribe to domain changes to obtain domain and IdP data
                switchMap(() => this.domainSelectorSvc.domainWithIdps),
                untilDestroyed(this))
            .subscribe(df => {
                this.domain = df?.domain;
                // Only add those federated identity providers available globally
                this.fedIdps = this.cfgSvc.config.federatedIdps.filter(idp => df?.federatedIdpIds?.includes(idp.id));
            });
    }
}
