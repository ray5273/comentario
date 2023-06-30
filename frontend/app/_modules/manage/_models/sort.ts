import { EventEmitter } from '@angular/core';

export interface SortSpec {
    /** Sort property name. */
    property?: string;
    /** Whether to sort ascending (false) or descending (true). */
    descending?: boolean;
}

export class Sort implements SortSpec {

    readonly changes = new EventEmitter<void>();

    constructor(
        /** Sort property name. */
        public property: string,
        /** Whether to sort ascending (false) or descending (true). */
        public descending: boolean = false,
    ) {}

    get spec(): SortSpec {
        return {property: this.property, descending: this.descending};
    }

    /**
     * Construct a sort instance from the given partial source.
     */
    static of(si: SortSpec, defProperty: string, defDescending: boolean): Sort {
        return new Sort(si?.property || defProperty, typeof si?.descending === 'boolean' ? si.descending : defDescending);
    }

    /**
     * Switch the sort direction to the opposite if the property is the same, otherwise switch to the given property.
     */
    apply(prop: string | null | undefined): void {
        if (prop === this.property) {
            this.descending = !this.descending;
        } else {
            this.property = prop ?? '';
            this.descending = false;
        }

        // Fire a change event
        this.changes.emit();
    }
}
