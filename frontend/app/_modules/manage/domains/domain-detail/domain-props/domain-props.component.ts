import { Component, Input } from '@angular/core';
import { Domain, IdentityProvider } from '../../../../../../generated-api';
import { ConfigService } from '../../../../../_services/config.service';

@Component({
    selector: 'app-domain-props',
    templateUrl: './domain-props.component.html',
})
export class DomainPropsComponent {

    _domain?: Domain;
    _idps?: IdentityProvider[];

    constructor(
        private readonly cfgSvc: ConfigService,
    ) {}

    @Input()
    set domain(d: Domain | undefined) {
        this._domain = d;
        this._idps = d ? this.cfgSvc.allIdps.filter(idp => d.idps.includes(idp.id)) : undefined;
    }
}
