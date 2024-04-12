import { Component, Input } from '@angular/core';
import { Commenter, Principal, User } from '../../../../generated-api';

/**
 * Renders user name, accompanied with their avatar, optionally as a link.
 */
@Component({
    selector: 'app-user-link',
    templateUrl: './user-link.component.html',
})
export class UserLinkComponent {

    /** User whose link to render. */
    @Input({required: true})
    user?: User | Principal | Commenter;

    /** Name of the user, in case the user isn't registered (anonymous). */
    @Input()
    userName?: string;

    /** Optional route for the user. If not provided, the rendered user won't be clickable. */
    @Input()
    linkRoute?: string | string[];
}
