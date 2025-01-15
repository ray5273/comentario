import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Commenter, Principal, User } from '../../../../generated-api';
import { UserAvatarComponent } from '../../tools/user-avatar/user-avatar.component';
import { CurrentUserBadgeComponent } from '../badges/current-user-badge/current-user-badge.component';

/**
 * Renders user name, accompanied with their avatar, optionally as a link.
 */
@Component({
    selector: 'app-user-link',
    templateUrl: './user-link.component.html',
    imports: [
        RouterLink,
        UserAvatarComponent,
        CurrentUserBadgeComponent,
    ],
})
export class UserLinkComponent {

    /** User whose link to render. */
    @Input({required: true})
    user?: User | Principal | Commenter;

    /** Name of the user, in case the user isn't registered. */
    @Input()
    userName?: string;

    /** Optional route for the user. If not provided, the rendered user won't be clickable. */
    @Input()
    linkRoute?: string | string[];
}
