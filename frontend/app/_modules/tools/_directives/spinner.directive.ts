import { Directive, ElementRef, Input, OnChanges, Renderer2, SimpleChanges } from '@angular/core';

export type SpinnerSize = 'sm' | 'lg';

@Directive({
    selector: '[appSpinner]',
    host: {
        '[attr.data-spinner-text]': 'spinnerText',
        '[attr.disabled]': 'appSpinner || disable ? "true" : undefined',
    },
})
export class SpinnerDirective implements OnChanges {

    /** Whether the spinning animation is shown on the component. */
    @Input()
    appSpinner = false;

    /** Whether to forcefully disable the component. This property must be used instead of the standard 'disabled' property. */
    @Input()
    disable = false;

    /** The size of the spinner animation, default is 'sm'. */
    @Input()
    spinnerSize: SpinnerSize = 'sm';

    /** Text to display under the spinner, only when spinnerSize === 'lg'. */
    @Input()
    spinnerText?: string;

    private _timer: any;

    constructor(
        private readonly element: ElementRef,
        private readonly renderer: Renderer2,
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        // Update the spinning state
        if (changes.appSpinner) {
            // Enable spinner after a short while to reduce flickering
            if (this.appSpinner) {
                this.cancelTimer();
                this._timer = setTimeout(() => this.setSpinning(true), 200);

            // Disable the spinner immediately
            } else {
                this.setSpinning(false);
            }
        }
    }

    /**
     * Remove the delay timer, if any.
     */
    private cancelTimer() {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }

    private setSpinning(value: boolean) {
        // Remove the delay timer, if any
        this.cancelTimer();

        // Add or remove one of the is-spinning-* classes
        const ne = this.element.nativeElement;
        if (value) {
            this.renderer.addClass(ne, `is-spinning-${this.spinnerSize}`);
        } else {
            this.renderer.removeClass(ne, `is-spinning-${this.spinnerSize}`);
        }
    }
}
