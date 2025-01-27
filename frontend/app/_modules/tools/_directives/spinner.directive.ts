import { Directive, Input } from '@angular/core';
import { BehaviorSubject, of, switchMap, timer } from 'rxjs';

export type SpinnerSize = 'sm' | 'lg';

@Directive({
    selector: '[appSpinner]',
    host: {
        '[class.is-spinning-lg]':   'spinnerSize === "lg" && show',
        '[class.is-spinning-sm]':   'spinnerSize === "sm" && show',
        '[attr.data-spinner-text]': 'spinnerText',
        '[attr.disabled]':          'show || disable ? "true" : undefined',
    },
})
export class SpinnerDirective {

    /** Whether to forcefully disable the component. This property must be used instead of the standard 'disabled' property. */
    @Input()
    disable = false;

    /** The size of the spinner animation, default is 'sm'. */
    @Input()
    spinnerSize: SpinnerSize = 'sm';

    /** Text to display under the spinner, only when spinnerSize === 'lg'. */
    @Input()
    spinnerText?: string;

    /**
     * Whether to show the spinner on the host element. The spinner is shown after a short delay, and removed
     * immediately.
     */
    show = false;

    private spinner$ = new BehaviorSubject<boolean>(false);

    constructor() {
        // Emit a delayed 0 when the spinner is to be shown, or immediate 1 when it's to be hidden
        this.spinner$.pipe(switchMap(b => b ? timer(200) : of(1))).subscribe(b => this.show = b === 0);
    }

    /** Whether the spinning animation is shown on the component. */
    @Input({required: true})
    set appSpinner(b: boolean) {
        this.spinner$.next(b);
    }
}
