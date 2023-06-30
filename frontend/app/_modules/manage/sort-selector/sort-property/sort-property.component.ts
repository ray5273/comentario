import { Component, Input } from '@angular/core';

/**
 * Child component of SortSelectorComponent, specifying sort options.
 */
@Component({
    selector: 'app-sort-property',
    template: '',
})
export class SortPropertyComponent {

    /** Optional ID to set on the sort button. */
    @Input()
    id?: string;

    /** Name of the property to sort by. */
    @Input({required: true})
    by?: string;

    /** Display name of the property to sort by. */
    @Input({required: true})
    label?: string;
}
