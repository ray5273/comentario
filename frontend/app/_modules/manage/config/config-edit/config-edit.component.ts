import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { first } from 'rxjs';
import { ApiGeneralService, InstanceDynamicConfigItem } from '../../../../../generated-api';
import { ConfigService } from '../../../../_services/config.service';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Paths } from '../../../../_utils/consts';

@UntilDestroy()
@Component({
    selector: 'app-dynamic-config-param-edit',
    templateUrl: './config-edit.component.html',
})
export class ConfigEditComponent implements OnInit {

    /** Items being edited. */
    items?: InstanceDynamicConfigItem[];

    /** Edit form. */
    form?: FormGroup;

    readonly loading = new ProcessingStatus();
    readonly saving = new ProcessingStatus();

    constructor(
        private readonly router: Router,
        private readonly fb: FormBuilder,
        private readonly configSvc: ConfigService,
        private readonly api: ApiGeneralService,
    ) {}

    ngOnInit(): void {
        // Fetch the config
        this.configSvc.dynamicConfig
            .pipe(
                untilDestroyed(this),
                first(),
                this.loading.processing())
            .subscribe(m => {
                // Convert the map into configuration items, sorting it by key
                this.items = Array.from(m.values()).sort((a, b) => a.key.localeCompare(b.key));

                // Create a form
                this.initForm();
            });
    }

    submit() {
        // Collect config values
        const vals = this.items!.map(i => ({
            key:   i.key,
            value: String(this.form!.controls[this.ctlName(i.key)].value),
        }));

        // Update the config on the server
        this.api.configDynamicUpdate(vals)
            .pipe(this.saving.processing())
            .subscribe(() => {
                // Reload the config
                this.configSvc.dynamicReload();
                // Go back to the list
                this.router.navigate([Paths.manage.config.dynamic]);
            });
    }

    /**
     * Return the name of a form control for the given item key.
     */
    ctlName(key: string) {
        // Replace dots with underscores because a dot means a subproperty
        return key.replaceAll('.', '_');
    }

    private initForm() {
        // Convert the configuration items into a control config
        const ctls = this.items!.reduce(
            (acc, e) => {
                acc[this.ctlName(e.key)] = e.datatype === 'boolean' ? e.value === 'true' : e.value;
                return acc;
            },
            {} as any);
        this.form = this.fb.group(ctls);
    }
}
