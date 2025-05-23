import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { User } from '../../../../../generated-api';
import { Paths } from '../../../../_utils/consts';
import { UserAvatarComponent } from '../../../tools/user-avatar/user-avatar.component';
import { CopyTextDirective } from '../../../tools/_directives/copy-text.directive';
import { CurrentUserBadgeComponent } from '../../badges/current-user-badge/current-user-badge.component';
import { IdentityProviderIconComponent } from '../../../tools/identity-provider-icon/identity-provider-icon.component';
import { CheckmarkComponent } from '../../../tools/checkmark/checkmark.component';
import { DatetimePipe } from '../../_pipes/datetime.pipe';
import { CountryNamePipe } from '../../_pipes/country-name.pipe';
import { ExternalLinkDirective } from '../../../tools/_directives/external-link.directive';

/**
 * Renders a table with user properties.
 */
@Component({
    selector: 'app-user-details',
    templateUrl: './user-details.component.html',
    imports: [
        UserAvatarComponent,
        RouterLink,
        CopyTextDirective,
        CurrentUserBadgeComponent,
        IdentityProviderIconComponent,
        CheckmarkComponent,
        DatetimePipe,
        DecimalPipe,
        CountryNamePipe,
        ExternalLinkDirective,
    ],
})
export class UserDetailsComponent {

    /** The user in question. */
    readonly user = input<User>();

    /** Whether to turn the ID into a link. */
    readonly userLink = input<boolean>();

    readonly Paths = Paths;
}
