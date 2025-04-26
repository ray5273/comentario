import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { KeyValuePipe } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { CommentSort } from '../../../../../../generated-api';
import { DynamicConfig } from '../../../../../_models/config';
import { InfoBlockComponent } from '../../../../tools/info-block/info-block.component';
import { InfoIconComponent } from '../../../../tools/info-icon/info-icon.component';
import { CommentSortPipe } from '../../../_pipes/comment-sort.pipe';
import { DynConfigSectionNamePipe } from '../../../_pipes/dyn-config-section-name.pipe';
import { ConfigSectionEditComponent } from '../../../config/config-section-edit/config-section-edit.component';
import { ValidatableDirective } from '../../../../tools/_directives/validatable.directive';

@Component({
    selector: 'app-domain-edit-general',
    templateUrl: './domain-edit-general.component.html',
    imports: [
        ReactiveFormsModule,
        InfoBlockComponent,
        InfoIconComponent,
        FaIconComponent,
        CommentSortPipe,
        KeyValuePipe,
        DynConfigSectionNamePipe,
        ConfigSectionEditComponent,
        NgbDropdownModule,
        ValidatableDirective,
    ],
})
export class DomainEditGeneralComponent {

    /** Form group to bind general controls to. */
    readonly generalFormGroup = input<FormGroup>();

    /** Form group to bind config controls to. */
    readonly configFormGroup = input<FormGroup>();

    /** Domain configuration to edit. */
    readonly config = input<DynamicConfig>();

    /** Whether the form is for creating a new domain, as opposed to editing an existing one. */
    readonly isNew = input(false);

    /** Possible sort orders. */
    readonly sorts = Object.values(CommentSort);

    // Icons
    readonly faExclamationTriangle = faExclamationTriangle;

    get isHttps(): boolean {
        return !!this.generalFormGroup()?.controls.isHttps.value;
    }

    set isHttps(b: boolean) {
        this.generalFormGroup()?.controls.isHttps.setValue(b);
    }
}
