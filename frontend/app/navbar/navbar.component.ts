import { Component } from '@angular/core';
import { Paths } from '../_utils/consts';
import { DocsService } from '../_services/docs.service';
import { AuthService } from '../_services/auth.service';
import { PluginService } from '../_modules/plugin/_services/plugin.service';

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.scss'],
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
