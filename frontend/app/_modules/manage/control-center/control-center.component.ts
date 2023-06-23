import { Component, OnInit } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import {
    faArrowDownUpAcrossLine,
    faAt,
    faChartLine,
    faChevronRight,
    faComments,
    faFileLines,
    faQuestionCircle,
    faSignOutAlt,
    faTachometerAlt,
    faUser,
    faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Paths } from '../../../_utils/consts';
import { AuthService } from '../../../_services/auth.service';
import { filter } from 'rxjs/operators';
import { Domain, Principal } from '../../../../generated-api';
import { DomainSelectorService } from '../_services/domain-selector.service';

@UntilDestroy()
@Component({
    selector: 'app-control-center',
    templateUrl: './control-center.component.html',
    styleUrls: ['./control-center.component.scss'],
})
export class ControlCenterComponent implements OnInit {

    /** Whether the sidebar is open by the user (only applies to small screens). */
    expanded = false;

    /** Logged-in principal. */
    principal?: Principal | null;

    /** Currently selected domain. */
    domain?: Domain;

    readonly Paths = Paths;

    // Icons
    readonly faArrowDownUpAcrossLine = faArrowDownUpAcrossLine;
    readonly faAt                    = faAt;
    readonly faChevronRight          = faChevronRight;
    readonly faChartLine             = faChartLine;
    readonly faComments              = faComments;
    readonly faFileLines             = faFileLines;
    readonly faQuestionCircle        = faQuestionCircle;
    readonly faSignOutAlt            = faSignOutAlt;
    readonly faTachometerAlt         = faTachometerAlt;
    readonly faUser                  = faUser;
    readonly faUsers                 = faUsers;

    constructor(
        private readonly router: Router,
        private readonly authSvc: AuthService,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}

    ngOnInit(): void {
        // Collapse the sidebar on route change
        this.router.events
            .pipe(untilDestroyed(this), filter(e => e instanceof NavigationStart))
            .subscribe(() => this.expanded = false);

        // Monitor principal changes
        this.authSvc.principal.pipe(untilDestroyed(this)).subscribe(p => this.principal = p);

        // Monitor selected domain changes
        this.domainSelectorSvc.domain.pipe(untilDestroyed(this)).subscribe(d => this.domain = d);
    }

    logout() {
        // Log off, then redirect to the home page
        this.authSvc.logout().subscribe(() => this.router.navigate(['/']));
    }

    toggleExpanded() {
        this.expanded = !this.expanded;
    }
}
