import { Component, Inject } from '@angular/core';
import { DOCUMENT, Location } from '@angular/common';
import { faCopy, faEdit } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Domain, FederatedIdentityProvider } from '../../../../../../generated-api';
import { ConfigService } from '../../../../../_services/config.service';
import { Paths } from '../../../../../_utils/consts';
import { DocsService } from '../../../../../_services/docs.service';
import { DomainSelectorService } from '../../../_services/domain-selector.service';

@UntilDestroy()
@Component({
    selector: 'app-domain-properties',
    templateUrl: './domain-properties.component.html',
})
export class DomainPropertiesComponent {

    _domain?: Domain;
    _fedIdps?: FederatedIdentityProvider[];

    readonly Paths = Paths;
    readonly snippet =
        `<script defer src="${Location.joinWithSlash(this.cfgSvc.clientConfig.baseUrl, 'comentario.js')}"></script>\n` +
        `<div id="comentario"></div>`;
    readonly installDocsUrl = this.docsSvc.getPageUrl('getting-started/');

    // Icons
    readonly faCopy = faCopy;
    readonly faEdit = faEdit;

    constructor(
        @Inject(DOCUMENT) private readonly doc: Document,
        private readonly cfgSvc: ConfigService,
        private readonly docsSvc: DocsService,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {
        // Subscribe to domain changes
        domainSelectorSvc.domain.pipe(untilDestroyed(this)).subscribe(d => this._domain = d);

        // Subscribe to domain IdP changes
        domainSelectorSvc.federatedIdpIds
            .pipe(untilDestroyed(this))
            // Only add those federated identity providers available globally
            .subscribe(ids => this._fedIdps = ids && this.cfgSvc.clientConfig.federatedIdps.filter(idp => ids.includes(idp.id)));
    }
}
