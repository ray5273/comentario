import { AbstractControl, ValidatorFn, Validators } from '@angular/forms';

/**
 * Additional custom validators.
 */
export class XtraValidators {

    /**
     * Return a validator for checking a host value, consisting of a hostname and an optional port number.
     */
    static get host(): ValidatorFn {
        return Validators.pattern(/^([a-z\d]|[a-z\d][-a-z\d]{0,61}[a-z\d])(\.([a-z\d]|[a-z\d][-a-z\d]{0,61}[a-z\d]))*(:\d{1,5})?$/);
    }

    /**
     * Return a validator for limiting the maximum (file) size.
     * @param n Maximum size in bytes
     */
    static maxSize(n: number): ValidatorFn {
        return (control: AbstractControl) => control.value?.size > n ? {maxSize: true} : null;
    }

    /**
     * Return a validator for checking a URL value.
     * @param forceHttps Whether to force HTTPS.
     */
    static url(forceHttps: boolean): ValidatorFn {
        return Validators.pattern(
            forceHttps ?
                /^https:\/\/.{1,2076}$/ :
                /^https?:\/\/.{1,2076}$/);
    }

    /**
     * Return a validator that enforces the given property of the value is set (truthy).
     * @param prop Property name that must be present in the control's value.
     */
    static hasProperty(prop: string): ValidatorFn {
        return (control: AbstractControl) => control.value?.[prop] ? null : {[`hasProperty[${prop}]`]: true};
    }
}

