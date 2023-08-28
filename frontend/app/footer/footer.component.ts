import { Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DocsService } from '../_services/docs.service';
import { Paths } from '../_utils/consts';
import { ConfigService } from "../_services/config.service";
import { AuthService } from '../_services/auth.service';

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

    constructor(
        readonly docsSvc: DocsService,
        private readonly configSvc: ConfigService,
        private readonly authSvc: AuthService,
    ) {
        // Fetch the auth status
        this.authSvc.principal
            .pipe(untilDestroyed(this))
            .subscribe(p => this.isAuthenticated = !!p);
    }
}
