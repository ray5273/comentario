import { Component } from '@angular/core';
import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Paths } from '../_utils/consts';
import { DocsService } from '../_services/docs.service';
import { AuthService } from '../_services/auth.service';
import { PluginService } from '../_modules/plugin/_services/plugin.service';
import { UserAvatarComponent } from '../_modules/tools/user-avatar/user-avatar.component';

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.scss'],
    imports: [
        RouterLinkActive,
        RouterLink,
        AsyncPipe,
        UserAvatarComponent,
        NgOptimizedImage,
    ],
})
export class NavbarComponent {

    readonly Paths = Paths;

    /** UI plugs destined for the navbar. */
    readonly plugs = this.pluginSvc.uiPlugsForLocation('navbar.menu');

    constructor(
        readonly authSvc: AuthService,
        readonly docsSvc: DocsService,
        private readonly pluginSvc: PluginService,
    ) {}
}
