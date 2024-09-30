import { Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faGitlab, faLinkedin, faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { DocsService } from '../_services/docs.service';
import { Paths } from '../_utils/consts';
import { ConfigService } from '../_services/config.service';
import { AuthService } from '../_services/auth.service';
import { PluginService } from '../_modules/plugin/plugin.service';

@UntilDestroy()
@Component({
    selector: 'app-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {

    /** Whether the user is authenticated */
    isAuthenticated = false;

    readonly Paths = Paths;
    readonly year = `2022–${new Date().getFullYear()}`;
    readonly version = this.configSvc.staticConfig.version;

    /** UI plugs destined for the footer. */
    readonly plugs = this.pluginSvc.uiPlugsForLocation('footer.menu');

    // Icons
    readonly faGitlab   = faGitlab;
    readonly faLinkedin = faLinkedin;
    readonly faXTwitter = faXTwitter;

    constructor(
        readonly docsSvc: DocsService,
        readonly configSvc: ConfigService,
        private readonly authSvc: AuthService,
        private readonly pluginSvc: PluginService,
    ) {
        // Fetch the auth status
        this.authSvc.principal
            .pipe(untilDestroyed(this))
            .subscribe(p => this.isAuthenticated = !!p);
    }
}
