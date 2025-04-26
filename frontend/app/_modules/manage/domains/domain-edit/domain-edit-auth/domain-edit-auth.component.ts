import { Component, input } from '@angular/core';
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
    readonly methodsFormGroup = input<FormGroup>();

    /** Form group to bind auth config controls to. */
    readonly configFormGroup = input<FormGroup>();

    /** Domain configuration to edit. */
    readonly config = input<DynamicConfig>();

    /** Federated IdPs configured on the current instance. */
    readonly federatedIdps = input<FederatedIdentityProvider[]>();

    // Icons
    readonly faExclamationTriangle = faExclamationTriangle;
}
