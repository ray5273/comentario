import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Paths } from '../_utils/consts';
import { DocsService } from '../_services/docs.service';
import { PluginService } from '../_modules/plugin/_services/plugin.service';
import { UserAvatarComponent } from '../_modules/tools/user-avatar/user-avatar.component';
import { PrincipalService } from '../_services/principal.service';

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.scss'],
    imports: [
        RouterLinkActive,
        RouterLink,
        UserAvatarComponent,
        NgOptimizedImage,
    ],
})
export class NavbarComponent {

    readonly Paths = Paths;

    /** UI plugs destined for the navbar. */
    readonly plugs = this.pluginSvc.uiPlugsForLocation('navbar.menu');

    constructor(
        readonly principalSvc: PrincipalService,
        readonly docsSvc: DocsService,
        private readonly pluginSvc: PluginService,
    ) {}
}
