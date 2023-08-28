import { Component } from '@angular/core';
import { ConfigService } from '../../../../_services/config.service';

@Component({
    selector: 'app-static-config',
    templateUrl: './static-config.component.html',
})
export class StaticConfigComponent {

    readonly cfg  = this.configSvc.staticConfig;

    constructor(
        private readonly configSvc: ConfigService,
    ) {}
}
