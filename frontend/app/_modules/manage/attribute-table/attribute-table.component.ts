import { Component, input } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';

/**
 * Renders an expandable section with an attribute table.
 */
@Component({
    selector: 'app-attribute-table',
    templateUrl: './attribute-table.component.html',
    imports: [
        FaIconComponent,
        NgbCollapse,
        KeyValuePipe,
    ],
})
export class AttributeTableComponent {

    private static _id = 0;

    /** Attributes to render. */
    readonly attributes = input<Record<string, string>>();

    collapsed = true;

    // Unique instance ID
    readonly id = ++AttributeTableComponent._id;

    // Icons
    readonly faAngleDown = faAngleDown;
}
