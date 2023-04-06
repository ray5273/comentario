import { Component, Inject, Input } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { faClone, faEdit, faFileExport, faFileImport } from '@fortawesome/free-solid-svg-icons';
import { ApiOwnerService, Domain, IdentityProvider } from '../../../../../../generated-api';
import { ConfigService } from '../../../../../_services/config.service';
import { Paths } from '../../../../../_utils/consts';

@Component({
    selector: 'app-domain-props',
    templateUrl: './domain-props.component.html',
})
export class DomainPropsComponent {

    _domain?: Domain;
    _idps?: IdentityProvider[];

    readonly Paths = Paths;

    // Icons
    readonly faClone      = faClone;
    readonly faEdit       = faEdit;
    readonly faFileExport = faFileExport;
    readonly faFileImport = faFileImport;

    constructor(
        @Inject(DOCUMENT) private readonly doc: Document,
        private readonly cfgSvc: ConfigService,
        private readonly api: ApiOwnerService,
    ) {}

    @Input()
    set domain(d: Domain | undefined) {
        this._domain = d;
        this._idps = d ? this.cfgSvc.allIdps.filter(idp => d.idps.includes(idp.id)) : undefined;
    }

    exportData() {
        // Trigger an export
        this.api.domainExport(this._domain!.host)
            .subscribe(b => {
                // Create a link element
                const a = this.doc.createElement('a');
                a.href = URL.createObjectURL(b);
                a.download = `${this._domain!.host}-${new Date().toISOString()}.json.gz`;

                // "Click" the link: this should cause a file download
                a.click();

                // Cleanup
                URL.revokeObjectURL(a.href);
            });
    }
}
