import { Component } from '@angular/core';
import { DocsService } from '../_services/docs.service';
import { Paths } from '../_utils/consts';
import { ConfigService } from "../_services/config.service";

@Component({
    selector: 'app-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {

    readonly Paths = Paths;
    readonly year = `2022–${new Date().getFullYear()}`;
    readonly version = this.configSvc.config.version;

    constructor(
        readonly docsSvc: DocsService,
        private readonly configSvc: ConfigService,
    ) {}
}
