import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { ConfigService } from '../../../../../_services/config.service';
import { DocsService } from '../../../../../_services/docs.service';

@Component({
    selector: 'app-domain-installation',
    templateUrl: './domain-installation.component.html',
})
export class DomainInstallationComponent {

    readonly snippet: string;
    readonly installDocsUrl = this.docsSvc.getPageUrl('getting-started/');

    // Icons
    readonly faCopy = faCopy;

    constructor(
        private readonly cfgSvc: ConfigService,
        private readonly docsSvc: DocsService,
    ) {
        const script = Location.joinWithSlash(this.cfgSvc.clientConfig.baseUrl, 'comentario.js');
        this.snippet =
            `<script defer src="${script}"></script>\n` +
            `<div id="comentario"></div>`;
    }
}
