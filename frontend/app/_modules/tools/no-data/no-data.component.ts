import { Component, input } from '@angular/core';

/**
 * Component that only shows the "No data" placeholder text.
 */
@Component({
    selector: 'app-no-data',
    template: '<div [class.h-100]="fullHeight()" class="p-3 text-dimmed d-flex justify-content-center align-items-center" i18n>No data available.</div>',
})
export class NoDataComponent {

    /** Whether the inner div should occupy the full height of the parent element. */
    readonly fullHeight = input(false);
}
