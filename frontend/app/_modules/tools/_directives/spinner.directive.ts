import { Directive, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap, timer } from 'rxjs';
import { map } from 'rxjs/operators';

export type SpinnerSize = 'sm' | 'lg';

@Directive({
    selector: '[appSpinner]',
    host: {
        '[class.is-spinning-lg]':   'spinnerSize() === "lg" && show()',
        '[class.is-spinning-sm]':   'spinnerSize() === "sm" && show()',
        '[attr.data-spinner-text]': 'spinnerText()',
        '[attr.disabled]':          'show() || disable() ? "true" : undefined',
    },
})
export class SpinnerDirective {

    /** Whether the spinning animation is shown on the component. */
    readonly appSpinner = input(false);

    /** Whether to forcefully disable the component. This property must be used instead of the standard 'disabled' property. */
    readonly disable = input(false);

    /** The size of the spinner animation, default is 'sm'. */
    readonly spinnerSize = input<SpinnerSize>('sm');

    /** Text to display under the spinner, only when spinnerSize === 'lg'. */
    readonly spinnerText = input<string>();

    /** Whether to show the spinner on the host element. The spinner is shown after a short delay, and removed immediately. */
    readonly show = toSignal(
        toObservable(this.appSpinner).pipe(switchMap(b => b ? timer(200) : of(1)), map(n => n === 0)),
        {initialValue: false});
}
