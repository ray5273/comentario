import { Directive, ElementRef, inject } from '@angular/core';

/**
 * Directive that "converts" Angular validation classes (ng-valid, ng-invalid) to Bootstrap validation classes
 * (is-valid, is-invalid).
 */
@Directive({
    selector: '[appValidatable]',
    host: {
        '[class.is-valid]':   'classes.contains("ng-touched") && classes.contains("ng-valid")',
        '[class.is-invalid]': 'classes.contains("ng-touched") && classes.contains("ng-invalid")',
    },
})
export class ValidatableDirective {
    readonly classes: DOMTokenList = inject(ElementRef).nativeElement.classList;
}
