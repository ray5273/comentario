import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { DomainExtension } from '../../../../../../generated-api';
import { InfoBlockComponent } from '../../../../tools/info-block/info-block.component';
import { InfoIconComponent } from '../../../../tools/info-icon/info-icon.component';
import { NoDataComponent } from '../../../../tools/no-data/no-data.component';

@Component({
    selector: 'app-domain-edit-extensions',
    templateUrl: './domain-edit-extensions.component.html',
    imports: [
        ReactiveFormsModule,
        InfoBlockComponent,
        InfoIconComponent,
        FaIconComponent,
        NoDataComponent,
    ],
})
export class DomainEditExtensionsComponent {

    /** Form group to bind controls to. */
    readonly formGroup = input<FormGroup>();

    /** Enabled domain extensions. */
    readonly extensions = input<DomainExtension[]>();

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
