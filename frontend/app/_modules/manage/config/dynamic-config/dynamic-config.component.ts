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
    items?: { [section: string]: DynamicConfigItem[] };

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
        this.configSvc.dynamicConfig
            .pipe(untilDestroyed(this))
            // Convert the map into configuration items, sorting it by key
            .subscribe(m => this.items = this.groupBySection(Array.from(m.values())));
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

    /**
     * Return an object whose keys are configuration items' section keys and values are the item lists.
     */
    private groupBySection(items?: DynamicConfigItem[]): { [key: string]: DynamicConfigItem[] } | undefined {
        return items
            // Sort configuration items by section and item key
            ?.sort((a, b) => a.section?.localeCompare(b.section ?? '') || a.key.localeCompare(b.key))
            // Group items by section
            .reduce(
                (acc, i) => {
                    const sec = i.section || '';
                    if (sec in acc) {
                        acc[sec].push(i);
                    } else {
                        acc[sec] = [i];
                    }
                    return acc;
                },
                {} as { [key: string]: DynamicConfigItem[] });
    }
}
