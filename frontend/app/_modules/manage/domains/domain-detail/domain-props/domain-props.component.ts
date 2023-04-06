import { Component, Inject, Input } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import { Domain, IdentityProvider } from '../../../../../../generated-api';
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
    readonly faEdit = faEdit;

    constructor(
        @Inject(DOCUMENT) private readonly doc: Document,
        private readonly cfgSvc: ConfigService,
    ) {}

    @Input()
    set domain(d: Domain | undefined) {
        this._domain = d;
        this._idps = d ? this.cfgSvc.allIdps.filter(idp => d.idps.includes(idp.id)) : undefined;
    }
}
