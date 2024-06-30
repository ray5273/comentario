import { Component } from '@angular/core';
import { Paths } from '../_utils/consts';
import { DocsService } from '../_services/docs.service';
import { AuthService } from '../_services/auth.service';
import { ConfigService } from '../_services/config.service';

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {

    readonly Paths = Paths;

    /** UI plugs destined for the navbar. */
    readonly plugins = this.configSvc.pluginConfig.plugins?.map(pc => ({
        ...pc,
        menuPlugs: pc.uiPlugs?.filter(p => p.location === 'navbar.menu'),
    }));

    constructor(
        readonly configSvc: ConfigService,
        readonly authSvc: AuthService,
        readonly docsSvc: DocsService,
    ) {}
}
