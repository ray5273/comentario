import { DynamicConfigItem, DynamicConfigItemDatatype } from '../../generated-api';

/**
 * A typed variant of the DynamicConfigItem.
 */
export class TypedConfigItem implements DynamicConfigItem {

    constructor(props: DynamicConfigItem) {
        Object.assign(this, props);

        // Prepare a control name: replace dots with underscores because a dot means a subproperty
        this.controlName = this.key.replaceAll('.', '_');
    }

    /** Writable, untyped value. */
    value!: string;

    readonly key!: string;
    readonly datatype!: DynamicConfigItemDatatype;
    readonly updatedTime!: string;
    readonly userUpdated!: string;
    readonly section!: string;

    readonly defaultValue?: string;
    readonly min?: number;
    readonly max?: number;

    /**
     * Name of a form control for this item.
     */
    readonly controlName: string;

    /**
     * "Typed" default value of the item, with the correct datatype.
     */
    get defaultVal(): boolean | number | string {
        return this.convertVal(this.defaultValue);
    }

    /**
     * "Typed" value of the item, with the correct datatype.
     */
    get val(): boolean | number | string {
        return this.convertVal(this.value);
    }

    /**
     * "Typed" value of the item, with the correct datatype.
     */
    set val(v: boolean | number | string) {
        switch (this.datatype) {
            case 'bool':
                this.value = v ? 'true' : 'false';
                break;
            case 'int':
                this.value = String(v);
                break;
            default:
                this.value = v as string;
        }
    }


    /**
     * Convert the given string value into a "typed" one with the correct datatype.
     */
    private convertVal(s: string | undefined): boolean | number | string {
        switch (this.datatype) {
            case 'bool':
                return s === 'true';
            case 'int':
                return Number(s);
            default:
                return s ?? '';
        }
    }
}
