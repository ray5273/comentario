import { Component, OnInit } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { faAt, faChevronRight, faQuestionCircle, faSignOutAlt, faTachometerAlt } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Paths } from '../../../_utils/consts';
import { AuthService } from '../../../_services/auth.service';
import { filter } from 'rxjs/operators';

@UntilDestroy()
@Component({
    selector: 'app-control-center',
    templateUrl: './control-center.component.html',
    styleUrls: ['./control-center.component.scss'],
})
export class ControlCenterComponent implements OnInit {

    /** Whether the sidebar is open by the user (only applies to small screens). */
    expanded = false;

    readonly Paths = Paths;

    // Icons
    readonly faAt             = faAt;
    readonly faChevronRight   = faChevronRight;
    readonly faQuestionCircle = faQuestionCircle;
    readonly faSignOutAlt     = faSignOutAlt;
    readonly faTachometerAlt  = faTachometerAlt;

    constructor(
        private readonly router: Router,
        private readonly authSvc: AuthService,
    ) {}

    ngOnInit(): void {
        // Collapse the sidebar on route change
        this.router.events
            .pipe(filter(e => e instanceof NavigationStart), untilDestroyed(this))
            .subscribe(() => this.expanded = false);
    }

    logout() {
        // Log off, then redirect to the home page
        this.authSvc.logout().subscribe(() => this.router.navigate(['/']));
    }
}
