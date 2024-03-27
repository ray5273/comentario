import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faPencil, faUndo } from '@fortawesome/free-solid-svg-icons';
import { ConfigService } from '../../../../_services/config.service';
import { ApiGeneralService, DynamicConfigItem } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ToastService } from '../../../../_services/toast.service';

@UntilDestroy()
@Component({
    selector: 'app-dynamic-config',
    templateUrl: './dynamic-config.component.html',
})
export class DynamicConfigComponent implements OnInit {

    /** Config items, grouped by section. */
    bySection?: { [section: string]: DynamicConfigItem[] };

    readonly resetting = new ProcessingStatus();

    // Icons
    readonly faPencil = faPencil;
    readonly faUndo   = faUndo;

    constructor(
        private readonly configSvc: ConfigService,
        private readonly api: ApiGeneralService,
        private readonly toastSvc: ToastService,
    ) {}

    ngOnInit(): void {
        // Subscribe to param changes
        this.configSvc.dynamicConfig.pipe(untilDestroyed(this)).subscribe(dc => this.bySection = dc.bySection);
    }

    reset() {
        this.api.configDynamicReset()
            .pipe(this.resetting.processing())
            .subscribe(() => {
                // Add a success toast
                this.toastSvc.success('data-updated');
                // Reload the config
                this.configSvc.dynamicReload();
            });
    }
}
