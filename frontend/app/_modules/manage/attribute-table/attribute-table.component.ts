import { Component, Input } from '@angular/core';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';

/**
 * Renders an expandable section with an attribute table.
 */
@Component({
    selector: 'app-attribute-table',
    templateUrl: './attribute-table.component.html',
})
export class AttributeTableComponent {

    private static _id = 0;

    /**
     * Attributes to render.
     */
    @Input({required: true})
    attributes?: Record<string, string>;

    collapsed = true;

    // Unique instance ID
    readonly id = ++AttributeTableComponent._id;

    // Icons
    readonly faAngleDown = faAngleDown;
}
