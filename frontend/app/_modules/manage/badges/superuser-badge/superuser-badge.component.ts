import { Component } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBolt } from '@fortawesome/free-solid-svg-icons';

@Component({
    selector: 'app-superuser-badge',
    templateUrl: './superuser-badge.component.html',
    imports: [
        FaIconComponent,
    ],
})
export class SuperuserBadgeComponent {
    // Icons
    readonly faBolt = faBolt;
}
