import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DynamicConfig } from '../../../../_models/config';

@Component({
    selector: 'app-config-section-edit',
    templateUrl: './config-section-edit.component.html',
})
export class ConfigSectionEditComponent implements OnChanges {

    /** Form group to add controls to. */
    @Input({required: true})
    formGroup?: FormGroup;

    /** The configuration being edited. */
    @Input({required: true})
    config?: DynamicConfig;

    /** Section to render editors for. */
    @Input({required: true})
    section?: string;

    /** Base path for rendering info icons for each parameter. Optional, if not provided, no info icons will appear. */
    @Input()
    docsBasePath?: string;

    constructor(
        private readonly fb: FormBuilder,
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.formGroup || changes.config || changes.section) {
            this.recreateControls();
        }
    }

    /**
     * Return the name of a form control for the given item key.
     */
    ctlName(key: string) {
        // Replace dots with underscores because a dot means a subproperty
        return key.replaceAll('.', '_');
    }

    /**
     * Remove all form controls created for this editor.
     * @private
     */
    private recreateControls() {
        if (!this.formGroup) {
            return;
        }

        // Remove all created controls
        Object.keys(this.formGroup.controls).forEach(c => this.formGroup!.removeControl(c, {emitEvent: false}));

        // Create new controls
        if (this.section) {
            this.config
                ?.bySection[this.section]
                ?.forEach(item => {
                    const ctl = this.fb.nonNullable.control(item.datatype === 'boolean' ? item.value === 'true' : item.value);
                    this.formGroup!.addControl(this.ctlName(item.key), ctl, {emitEvent: false});
                    // Subscribe to the control's value changes to update the underlying config
                    ctl.valueChanges.subscribe(v => item.value = String(v));
                });
        }
    }
}
