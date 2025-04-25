import { Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Directive that "converts" Angular validation classes (ng-valid, ng-invalid) to Bootstrap validation classes
 * (is-valid, is-invalid).
 */
@Directive({
    selector: '[appValidatable]',
    host: {
        '[class.is-valid]':   'state("valid", "ng-valid")',
        '[class.is-invalid]': 'state("invalid", "ng-invalid")',
    },
})
export class ValidatableDirective {

    private readonly classes: DOMTokenList = inject(ElementRef).nativeElement.classList;

    /**
     * Reference control or directive to take the validity state from. It has to provide properties `valid` and/or
     * `invalid`, which will then translate to classes `is-valid` and `is-invalid`, respectively.
     *
     * If not provided, the directive will use classes `ng-valid`/`ng-invalid` on the host element.
     */
    readonly appValidatable = input<any>();

    /** Whether to apply validity classes only when the control is touched. */
    readonly validateUntouched = input(false);

    /**
     * Get the control validity state, either from the specified property of `appValidatable`, or from the given host
     * element class.
     * @param refProperty Name of the property on the `appValidatable`.
     * @param hostClass Name of the host class.
     */
    state(refProperty: string, hostClass: string): boolean {
        return this.shouldValidate() &&
            (this.appValidatable() ? !!this.appValidatable()[refProperty] : this.classes.contains(hostClass));
    }

    /**
     * Returns whether the control state is to be taken into account at all.
     * @private
     */
    private shouldValidate(): boolean {
        return this.validateUntouched() ||
            (this.appValidatable() ? this.appValidatable().touched : this.classes.contains('ng-touched'));
    }
}
