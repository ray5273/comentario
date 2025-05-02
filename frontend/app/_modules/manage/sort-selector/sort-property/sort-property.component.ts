import { Component, input } from '@angular/core';

/**
 * Child component of SortSelectorComponent, specifying sort options.
 */
@Component({
    selector: 'app-sort-property',
    template: '',
})
export class SortPropertyComponent {

    /** Optional ID to set on the sort button. */
    readonly id = input<string>();

    /** Name of the property to sort by. */
    readonly by = input.required<string>();

    /** Display name of the property to sort by. */
    readonly label = input.required<string>();
}
