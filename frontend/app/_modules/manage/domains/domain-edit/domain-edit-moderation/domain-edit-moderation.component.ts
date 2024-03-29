import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { DomainModNotifyPolicy } from '../../../../../../generated-api';

@Component({
    selector: 'app-domain-edit-moderation',
    templateUrl: './domain-edit-moderation.component.html',
})
export class DomainEditModerationComponent {

    /** Form group to bind controls to. */
    @Input({required: true})
    formGroup?: FormGroup;

    /** All available moderator notification policies. */
    readonly modNotifyPolicies = Object.values(DomainModNotifyPolicy);
}
