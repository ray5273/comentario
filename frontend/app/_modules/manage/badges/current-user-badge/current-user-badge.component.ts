import { Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faUserCheck } from '@fortawesome/free-solid-svg-icons';
import { PrincipalService } from '../../../../_services/principal.service';

/**
 * Component that renders a "You" badge for the current user, i.e. when the specified user ID matches the currently
 * logged-in principal.
 */
@Component({
    selector: 'app-current-user-badge',
    templateUrl: './current-user-badge.component.html',
    imports: [
        NgClass,
        FaIconComponent,
    ],
})
export class CurrentUserBadgeComponent {

    /** ID of the user to render a badge (or no badge) for. */
    readonly userId = input<string>();

    /** Additional classes to add to the badge if it's visible. */
    readonly badgeClasses = input<string | string[]>();

    /** Whether the user denoted by userId is the currently authenticated one. */
    readonly isCurrent = computed(() => {
        const uid = this.userId();
        return uid && uid === this.principalSvc.principal()?.id;
    });

    // Icons
    readonly faUserCheck = faUserCheck;

    constructor(
        private readonly principalSvc: PrincipalService,
    ) {}
}
