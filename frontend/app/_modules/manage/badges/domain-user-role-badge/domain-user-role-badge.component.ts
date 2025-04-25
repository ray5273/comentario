import { Component, input } from '@angular/core';
import { DomainUserRole } from '../../../../../generated-api';

/**
 * Component that shows a badge for the given domain user, corresponding to their domain role.
 */
@Component({
    selector: 'app-domain-user-role-badge',
    templateUrl: './domain-user-role-badge.component.html',
    styleUrls: ['./domain-user-role-badge.component.scss'],
    imports: [],
})
export class DomainUserRoleBadgeComponent {

    /** Domain user role in question. */
    readonly role = input<DomainUserRole | null>();

    readonly dur = DomainUserRole;
}
