import { Component, Input } from '@angular/core';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { FormGroup } from '@angular/forms';
import { FederatedIdentityProvider } from '../../../../../../generated-api';
import { DynamicConfig } from '../../../../../_models/config';

@Component({
    selector: 'app-domain-edit-auth',
    templateUrl: './domain-edit-auth.component.html',
})
export class DomainEditAuthComponent {

    /** Form group to bind auth methods controls to. */
    @Input({required: true})
    methodsFormGroup?: FormGroup;

    /** Form group to bind auth config controls to. */
    @Input({required: true})
    configFormGroup?: FormGroup;

    /** Domain configuration to edit. */
    @Input({required: true})
    config?: DynamicConfig;

    /** Federated IdPs configured on the current instance. */
    @Input({required: true})
    federatedIdps?: FederatedIdentityProvider[];

    // Icons
    readonly faExclamationTriangle = faExclamationTriangle;
}
