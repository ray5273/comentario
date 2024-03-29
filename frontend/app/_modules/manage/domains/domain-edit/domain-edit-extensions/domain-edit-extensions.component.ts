import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { DomainExtension } from '../../../../../../generated-api';

@Component({
    selector: 'app-domain-edit-extensions',
    templateUrl: './domain-edit-extensions.component.html',
})
export class DomainEditExtensionsComponent {

    /** Form group to bind controls to. */
    @Input({required: true})
    formGroup?: FormGroup;

    /** Enabled domain extensions. */
    @Input({required: true})
    extensions?: DomainExtension[];

    // Icons
    readonly faExclamationTriangle = faExclamationTriangle;

    /**
     * Get a HTML-safe ID for an extension. Replaces all dots with hyphens.
     * @param ext Extension to get ID for.
     */
    getExtId(ext: DomainExtension): string {
        return `extension-${ext.id.replaceAll('.', '-')}`;
    }
}
