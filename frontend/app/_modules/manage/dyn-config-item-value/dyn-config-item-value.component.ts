import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TypedConfigItem } from '../../../_models/typed-config-item';
import { CheckmarkComponent } from '../../tools/checkmark/checkmark.component';

@Component({
    selector: 'app-dyn-config-item-value',
    templateUrl: './dyn-config-item-value.component.html',
    imports: [
        CheckmarkComponent,
        DecimalPipe,
    ],
})
export class DynConfigItemValueComponent {

    /** The item to display value for. */
    readonly item = input<TypedConfigItem>();
}
