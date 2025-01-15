import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DomainModNotifyPolicy } from '../../../../../../generated-api';
import { InfoBlockComponent } from '../../../../tools/info-block/info-block.component';
import { InfoIconComponent } from '../../../../tools/info-icon/info-icon.component';
import { ModeratorNotifyPolicyPipe } from '../../../_pipes/moderator-notify-policy.pipe';

@Component({
    selector: 'app-domain-edit-moderation',
    templateUrl: './domain-edit-moderation.component.html',
    imports: [
        ReactiveFormsModule,
        InfoBlockComponent,
        InfoIconComponent,
        DecimalPipe,
        ModeratorNotifyPolicyPipe,
    ],
})
export class DomainEditModerationComponent {

    /** Form group to bind controls to. */
    @Input({required: true})
    formGroup?: FormGroup;

    /** All available moderator notification policies. */
    readonly modNotifyPolicies = Object.values(DomainModNotifyPolicy);
}
