import { Component } from '@angular/core';

/**
 * Component that only shows the "No data" placeholder text.
 */
@Component({
    selector: 'app-no-data',
    template: '<div class="p-3 text-center text-muted" i18n>No data available.</div>',
})
export class NoDataComponent {}
