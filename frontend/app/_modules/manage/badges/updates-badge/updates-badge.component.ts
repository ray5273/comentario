import { Component, Input } from '@angular/core';
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

    /**
     * Number of available updates. If 0, an asterisk is displayed instead.
     */
    @Input()
    numUpdates = 0;

    /**
     * Title to display in the tooltip.
     */
    @Input()
    title = $localize`Updates available`;

    // Icons
    readonly faAsterisk = faAsterisk;
}
