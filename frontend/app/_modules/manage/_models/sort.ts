import { EventEmitter } from '@angular/core';

/**
 * Sort specification, consisting of a property and a sort direction.
 */
export class Sort {

    /** Emits whenever sort property or direction is changed. */
    readonly changes = new EventEmitter<void>();

    /** Sort property name. */
    property = this.defaultProperty;

    /** Whether to sort ascending (false) or descending (true). */
    descending = this.defaultDescending;

    constructor(
        /** Allowed sort property names. */
        readonly allowedProps: string[],
        /** Default sort property. */
        readonly defaultProperty: string,
        /** Default descending value. */
        readonly defaultDescending: boolean,
    ) {}

    /** Sort settings serialised into a string. */
    get asString(): string {
        return (this.descending ? '-' : '') + this.property;
    }

    set asString(s: string) {
        // If the string starts with a dash, it's a descending sort
        const desc = s.startsWith('-');

        // The property is the remaining part of the string
        this.setSort(desc ? s.substring(1) : s, desc);
    }

    /**
     * Switch the sort direction to the opposite if the property is the same, otherwise switch to the given property.
     */
    apply(prop: string | null | undefined): void {
        this.setSort(prop, prop === this.property && !this.descending);
    }

    /**
     * Validate and update the sort to the given values.
     * @private
     */
    private setSort(prop: string | null | undefined, desc: boolean) {
        // Fall back to defaults should the property be unknown
        if (!prop || !this.valid(prop)) {
            prop = this.defaultProperty;
            desc = this.defaultDescending;
        }

        // Apply the sort, if anything is changing
        if (this.property !== prop || this.descending !== desc) {
            this.property   = prop;
            this.descending = desc;

            // Fire a change event
            this.changes.emit();
        }
    }

    /**
     * Validate the passed property name.
     * @param s Property name to validate.
     * @private
     */
    private valid(s: string): boolean {
        return this.allowedProps.includes(s);
    }
}
