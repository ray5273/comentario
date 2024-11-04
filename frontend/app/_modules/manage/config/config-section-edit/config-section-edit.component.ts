import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { DynamicConfig } from '../../../../_models/config';
import { TypedConfigItem } from '../../../../_models/typed-config-item';

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

    /**
     * Base path for rendering info icons for each parameter, without the trailing slash. Optional, if not provided, no
     * info icons will appear.
     */
    @Input()
    docsBasePath?: string;

    // Icons
    readonly faRotateLeft = faRotateLeft;

    constructor(
        private readonly fb: FormBuilder,
    ) {}

    get items(): TypedConfigItem[] | undefined {
        return this.section ? this.config?.bySection[this.section] : undefined;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.formGroup || changes.config || changes.section) {
            this.recreateControls();
        }
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
        this.items?.forEach(item => {
            const ctl = this.fb.nonNullable.control(item.val);
            this.formGroup!.addControl(item.controlName, ctl, {emitEvent: false});
            // Subscribe to the control's value changes to update the underlying config
            ctl.valueChanges.subscribe(v => item.val = v);
        });
    }

    /**
     * Revert the value of a control with the given key value to the item's default.
     */
    revert(item: TypedConfigItem, event?: Event) {
        event?.preventDefault();
        this.formGroup?.controls[item.controlName]?.setValue(item.defaultVal);
    }
}
