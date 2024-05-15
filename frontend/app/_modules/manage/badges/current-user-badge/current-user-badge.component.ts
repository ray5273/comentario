import { Component, Input } from '@angular/core';
import { AuthService } from '../../../../_services/auth.service';

/**
 * Component that renders a "YOU" badge for the current user, i.e. when the specified user ID matches the currently
 * logged-in principal.
 */
@Component({
    selector: 'app-current-user-badge',
    templateUrl: './current-user-badge.component.html',
})
export class CurrentUserBadgeComponent {

    /** ID of the user to render a badge (or no badge) for. */
    @Input({required: true})
    userId?: string;

    /** Additional classes to add to the badge if it's visible. */
    @Input()
    badgeClasses?: string | string[];

    /** Observable of the currently authenticated principal. */
    readonly principal = this.authSvc.principal;

    constructor(
        private readonly authSvc: AuthService,
    ) {}
}
