import { Component, OnInit } from '@angular/core';
import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
    faArrowDownUpAcrossLine,
    faAt,
    faChartLine,
    faChevronRight,
    faComments,
    faFileLines,
    faList,
    faQuestionCircle,
    faSignOutAlt,
    faTachometerAlt,
    faUsers,
    faUsersRectangle,
    faWrench,
} from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Paths } from '../../../_utils/consts';
import { AuthService } from '../../../_services/auth.service';
import { DomainMeta, DomainSelectorService } from '../_services/domain-selector.service';
import { CommentService } from '../_services/comment.service';
import { ConfigService } from '../../../_services/config.service';
import { UpdatesBadgeComponent } from '../badges/updates-badge/updates-badge.component';
import { UserAvatarComponent } from '../../tools/user-avatar/user-avatar.component';
import { ConfirmDirective } from '../../tools/_directives/confirm.directive';

@UntilDestroy()
@Component({
    selector: 'app-control-center',
    templateUrl: './control-center.component.html',
    styleUrls: ['./control-center.component.scss'],
    imports: [
        FaIconComponent,
        RouterLink,
        RouterLinkActive,
        AsyncPipe,
        UpdatesBadgeComponent,
        UserAvatarComponent,
        ConfirmDirective,
        RouterOutlet,
        NgOptimizedImage,
    ],
})
export class ControlCenterComponent implements OnInit {

    /** Whether the sidebar is open by the user (only applies to small screens). */
    expanded = false;

    /** Domain/user metadata. */
    domainMeta?: DomainMeta;

    readonly Paths = Paths;

    readonly pendingCommentCount$ = this.commentService.countPending;
    readonly configUpdates$       = this.configSvc.isUpgradable;

    // Icons
    readonly faArrowDownUpAcrossLine = faArrowDownUpAcrossLine;
    readonly faAt                    = faAt;
    readonly faChevronRight          = faChevronRight;
    readonly faChartLine             = faChartLine;
    readonly faComments              = faComments;
    readonly faFileLines             = faFileLines;
    readonly faList                  = faList;
    readonly faQuestionCircle        = faQuestionCircle;
    readonly faSignOutAlt            = faSignOutAlt;
    readonly faTachometerAlt         = faTachometerAlt;
    readonly faUsers                 = faUsers;
    readonly faUsersRectangle        = faUsersRectangle;
    readonly faWrench                = faWrench;

    constructor(
        private readonly router: Router,
        private readonly configSvc: ConfigService,
        private readonly authSvc: AuthService,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly commentService: CommentService,
    ) {}

    get isSuper(): boolean | undefined {
        return this.domainMeta?.principal?.isSuperuser;
    }

    get canManageDomain(): boolean | undefined {
        return this.domainMeta?.canManageDomain;
    }

    ngOnInit(): void {
        // Collapse the sidebar on route change
        this.router.events
            .pipe(untilDestroyed(this), filter(e => e instanceof NavigationStart))
            .subscribe(() => this.expanded = false);

        // Monitor selected domain/user changes
        this.domainSelectorSvc.domainMeta(true)
            .pipe(untilDestroyed(this))
            .subscribe(meta => this.domainMeta = meta);
    }

    logout() {
        // Log off, then redirect to the home page
        this.authSvc.logout().subscribe(() => this.router.navigate(['/']));
    }

    toggleExpanded() {
        this.expanded = !this.expanded;
    }
}
