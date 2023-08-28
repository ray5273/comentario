import { Component, Input } from '@angular/core';
import { InstanceDynamicConfigItem } from '../../../../../generated-api';
import { ConfigService } from '../../../../_services/config.service';

@Component({
    selector: 'app-dynamic-config-param-edit',
    templateUrl: './config-param-edit.component.html',
})
export class ConfigParamEditComponent {

    /** Item being edited. */
    item?: InstanceDynamicConfigItem;

    /**
     * Item key.
     */
    @Input({required: true})
    set key(key: string) {
        // Fetch the item in question
        this.configSvc.dynamicConfig.subscribe(dc => this.item = dc.get(key));
    }

    constructor(
        private readonly configSvc: ConfigService,
    ) {}
}
