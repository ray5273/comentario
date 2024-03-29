import { Component, Input } from '@angular/core';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { FormGroup } from '@angular/forms';
import { CommentSort } from '../../../../../../generated-api';
import { DynamicConfig } from '../../../../../_models/config';

@Component({
    selector: 'app-domain-edit-general',
    templateUrl: './domain-edit-general.component.html',
})
export class DomainEditGeneralComponent {

    /** Form group to bind general controls to. */
    @Input({required: true})
    generalFormGroup?: FormGroup;

    /** Form group to bind config controls to. */
    @Input({required: true})
    configFormGroup?: FormGroup;

    /** Domain configuration to edit. */
    @Input({required: true})
    config?: DynamicConfig;

    /** Whether the form is for creating a new domain, as opposed to editing an existing one. */
    @Input({required: true})
    isNew = false;

    /** Possible sort orders. */
    readonly sorts = Object.values(CommentSort);

    // Icons
    readonly faExclamationTriangle = faExclamationTriangle;

    get isHttps(): boolean {
        return !!this.generalFormGroup?.controls.isHttps.value;
    }

    set isHttps(b: boolean) {
        this.generalFormGroup?.controls.isHttps.setValue(b);
    }
}
