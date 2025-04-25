import { Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faAsterisk } from '@fortawesome/free-solid-svg-icons';

@Component({
    selector: 'app-updates-badge',
    templateUrl: './updates-badge.component.html',
    imports: [
        FaIconComponent,
    ],
})
export class UpdatesBadgeComponent {

    /** Number of available updates. If 0, an asterisk is displayed instead. */
    readonly numUpdates = input(0);

    /** Title to display in the tooltip. */
    readonly title = input($localize`Updates available`);

    // Icons
    readonly faAsterisk = faAsterisk;
}
