import { Component, Input } from '@angular/core';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FederatedIdentityProvider } from '../../../../../../generated-api';
import { DynamicConfig } from '../../../../../_models/config';
import { InfoBlockComponent } from '../../../../tools/info-block/info-block.component';
import { InfoIconComponent } from '../../../../tools/info-icon/info-icon.component';
import { ConfigSectionEditComponent } from '../../../config/config-section-edit/config-section-edit.component';
import { IdentityProviderIconComponent } from '../../../../tools/identity-provider-icon/identity-provider-icon.component';
import { ValidatableDirective } from '../../../../tools/_directives/validatable.directive';

@Component({
    selector: 'app-domain-edit-auth',
    templateUrl: './domain-edit-auth.component.html',
    imports: [
        InfoBlockComponent,
        InfoIconComponent,
        ConfigSectionEditComponent,
        ReactiveFormsModule,
        IdentityProviderIconComponent,
        ValidatableDirective,
    ],
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
