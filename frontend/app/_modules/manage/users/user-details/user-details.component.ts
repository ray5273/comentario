import { Component, Input } from '@angular/core';
import { User } from '../../../../../generated-api';

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

}
