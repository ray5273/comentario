import { Component } from '@angular/core';
import { ConfigService } from '../../../../_services/config.service';

@Component({
    selector: 'app-dynamic-config',
    templateUrl: './dynamic-config.component.html',
})
export class DynamicConfigComponent {

    readonly cfg = this.configSvc.dynamicConfig;

    constructor(
        private readonly configSvc: ConfigService,
    ) {}

}
