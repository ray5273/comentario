import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ConfigService } from '../../../../_services/config.service';
import { InstanceDynamicConfigItem } from '../../../../../generated-api';

@UntilDestroy()
@Component({
    selector: 'app-dynamic-config',
    templateUrl: './dynamic-config.component.html',
})
export class DynamicConfigComponent implements OnInit {

    items?: InstanceDynamicConfigItem[];

    constructor(
        private readonly configSvc: ConfigService,
    ) {}

    ngOnInit(): void {
        // Subscribe to param changes
        this.configSvc.dynamicConfig
            .pipe(untilDestroyed(this))
            .subscribe(m => this.items = Array.from(m.values()));
    }
}
