import { Component, Input } from '@angular/core';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { FormGroup } from '@angular/forms';
import { FederatedIdentityProvider } from '../../../../../../generated-api';

@Component({
    selector: 'app-domain-edit-auth',
    templateUrl: './domain-edit-auth.component.html',
})
export class DomainEditAuthComponent {

    /** Form group to bind controls to. */
    @Input({required: true})
    formGroup?: FormGroup;

    /** Federated IdPs configured on the current instance. */
    @Input({required: true})
    federatedIdps?: FederatedIdentityProvider[];

    // Icons
    readonly faExclamationTriangle = faExclamationTriangle;
}
