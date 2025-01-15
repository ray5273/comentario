import { Component, OnInit } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { first } from 'rxjs';
import { ApiGeneralService } from '../../../../../generated-api';
import { ConfigService } from '../../../../_services/config.service';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Paths } from '../../../../_utils/consts';
import { ToastService } from '../../../../_services/toast.service';
import { DynamicConfig } from '../../../../_models/config';
import { SpinnerDirective } from '../../../tools/_directives/spinner.directive';
import { DynConfigSectionNamePipe } from '../../_pipes/dyn-config-section-name.pipe';
import { ConfigSectionEditComponent } from '../config-section-edit/config-section-edit.component';

@UntilDestroy()
@Component({
    selector: 'app-config-edit',
    templateUrl: './config-edit.component.html',
    imports: [
        SpinnerDirective,
        ReactiveFormsModule,
        KeyValuePipe,
        DynConfigSectionNamePipe,
        ConfigSectionEditComponent,
        RouterLink,
    ],
})
export class ConfigEditComponent implements OnInit {

    /** Config being edited. */
    config?: DynamicConfig;

    /** Edit form. */
    form = this.fb.group({});

    readonly loading = new ProcessingStatus();
    readonly saving = new ProcessingStatus();

    constructor(
        private readonly router: Router,
        private readonly fb: FormBuilder,
        private readonly configSvc: ConfigService,
        private readonly api: ApiGeneralService,
        private readonly toastSvc: ToastService,
    ) {}

    ngOnInit(): void {
        // Fetch the config
        this.configSvc.dynamicConfig
            .pipe(
                untilDestroyed(this),
                first(),
                this.loading.processing())
            .subscribe(c => {
                // Make a clone of the original config
                this.config = c.clone();

                // Create a form group per config section
                Object.keys(this.config!.bySection).forEach(s => this.form.addControl(s, this.fb.group({}), {emitEvent: false}));
            });
    }

    submit() {
        // Make sure the form is valid
        if (!this.form.valid) {
            return;
        }

        // Submit the config to the backend
        this.api.configDynamicUpdate(this.config!.items)
            .pipe(this.saving.processing())
            .subscribe(() => {
                // Reload the config
                this.configSvc.dynamicReload();
                // Add a success toast
                this.toastSvc.success({messageId: 'data-saved', keepOnRouteChange: true});
                // Go back to the list
                this.router.navigate([Paths.manage.config.dynamic]);
            });
    }
}
