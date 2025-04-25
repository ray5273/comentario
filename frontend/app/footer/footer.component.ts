import { Component, computed } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faGitlab, faLinkedin, faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { DocsService } from '../_services/docs.service';
import { Paths } from '../_utils/consts';
import { ConfigService } from '../_services/config.service';
import { PluginService } from '../_modules/plugin/_services/plugin.service';
import { PrincipalService } from '../_services/principal.service';

@UntilDestroy()
@Component({
    selector: 'app-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss'],
    imports: [
        RouterLink,
        FaIconComponent,
        RouterLinkActive,
        NgOptimizedImage,
    ],
})
export class FooterComponent {

    /** Whether the user is authenticated */
    readonly isAuthenticated = computed(() => !!this.principalSvc.principal());

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
        private readonly principalSvc: PrincipalService,
        private readonly pluginSvc: PluginService,
    ) {}
}
