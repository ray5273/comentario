import { Component, Input } from '@angular/core';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { FormGroup } from '@angular/forms';
import { CommentSort } from '../../../../../../generated-api';

@Component({
    selector: 'app-domain-edit-general',
    templateUrl: './domain-edit-general.component.html',
})
export class DomainEditGeneralComponent {

    /** Form group to bind controls to. */
    @Input({required: true})
    formGroup?: FormGroup;

    /** Whether the form is for creating a new domain, as opposed to editing an existing one. */
    @Input({required: true})
    isNew = false;

    /** Possible sort orders. */
    readonly sorts = Object.values(CommentSort);

    // Icons
    readonly faExclamationTriangle = faExclamationTriangle;

    get isHttps(): boolean {
        return !!this.formGroup?.controls.isHttps.value;
    }

    set isHttps(b: boolean) {
        this.formGroup?.controls.isHttps.setValue(b);
    }
}
