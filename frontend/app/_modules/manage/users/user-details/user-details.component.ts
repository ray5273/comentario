import { Component, Input } from '@angular/core';
import { User } from '../../../../../generated-api';
import { Paths } from '../../../../_utils/consts';

/**
 * Renders a table with user properties.
 */
@Component({
    selector: 'app-user-details',
    templateUrl: './user-details.component.html',
})
export class UserDetailsComponent {

    /** The user in question. */
    @Input({required: true})
    user?: User;

    /** Whether turn the ID into a link. */
    @Input()
    userLink?: boolean;

    readonly Paths = Paths;
}
