import { Component, OnInit } from '@angular/core';
import { KeyValuePipe, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPencil, faStarOfLife, faUndo } from '@fortawesome/free-solid-svg-icons';
import { ConfigService } from '../../../../_services/config.service';
import { ApiGeneralService } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { ToastService } from '../../../../_services/toast.service';
import { ConfigKeyDomainDefaultsPrefix } from '../../../../_models/config';
import { TypedConfigItem } from '../../../../_models/typed-config-item';
import { InfoBlockComponent } from '../../../tools/info-block/info-block.component';
import { SpinnerDirective } from '../../../tools/_directives/spinner.directive';
import { ConfirmDirective } from '../../../tools/_directives/confirm.directive';
import { DynConfigSectionNamePipe } from '../../_pipes/dyn-config-section-name.pipe';
import { InfoIconComponent } from '../../../tools/info-icon/info-icon.component';
import { DynConfigItemNamePipe } from '../../_pipes/dyn-config-item-name.pipe';
import { DynConfigItemValueComponent } from '../../dyn-config-item-value/dyn-config-item-value.component';

@UntilDestroy()
@Component({
    selector: 'app-dynamic-config',
    templateUrl: './dynamic-config.component.html',
    imports: [
        InfoBlockComponent,
        FaIconComponent,
        SpinnerDirective,
        RouterLink,
        ConfirmDirective,
        KeyValuePipe,
        DynConfigSectionNamePipe,
        InfoIconComponent,
        LowerCasePipe,
        DynConfigItemNamePipe,
        DynConfigItemValueComponent,
    ],
})
export class DynamicConfigComponent implements OnInit {

    /** Config items, grouped by section. */
    bySection?: Record<string, TypedConfigItem[]>;

    readonly resetting = new ProcessingStatus();
    readonly domainDefaultsPrefix = ConfigKeyDomainDefaultsPrefix;

    // Icons
    readonly faPencil     = faPencil;
    readonly faStarOfLife = faStarOfLife;
    readonly faUndo       = faUndo;

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
