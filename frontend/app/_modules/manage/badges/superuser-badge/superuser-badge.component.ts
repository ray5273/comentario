import { Component } from '@angular/core';
import { faBolt } from '@fortawesome/free-solid-svg-icons';

@Component({
    selector: 'app-superuser-badge',
    templateUrl: './superuser-badge.component.html',
})
export class SuperuserBadgeComponent {
    // Icons
    readonly faBolt = faBolt;
}
