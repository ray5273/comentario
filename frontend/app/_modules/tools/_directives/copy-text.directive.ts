import { Directive, ElementRef, HostListener, Input, Optional, Renderer2 } from '@angular/core';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';

// Work around IDE not recognising the symbol
declare let $localize: any;

@Directive({
    selector: '[appCopyText]',
})
export class CopyTextDirective {

    /**
     * Text that will be copied on a click on the host element. If empty, the text content of the host element will be copied.
     */
    @Input() appCopyText?: string;

    readonly tipBeforeCopy = $localize`Click to copy`;
    readonly tipAfterCopy  = $localize`Copied!`;

    constructor(
        private readonly renderer: Renderer2,
        private readonly element: ElementRef,
        @Optional() private readonly tooltip: NgbTooltip,
    ) {
        // If there's an ngbTooltip directive provided on the same element, use it for the hint
        if (tooltip) {
            tooltip.ngbTooltip = this.tipBeforeCopy;
            tooltip.autoClose = false;
            tooltip.animation = false;
            tooltip.container = 'body';

        // Put the hint into the title attribute otherwise
        } else {
            renderer.setAttribute(element.nativeElement, 'title', this.tipBeforeCopy);
        }
    }

    @HostListener('click')
    private clicked() {
        navigator.clipboard.writeText(this.appCopyText || this.element.nativeElement.textContent)
            .then(() => {
                if (this.tooltip) {
                    // Close the tooltip because it won't change the text on the fly, and reopen with new text
                    this.tooltip.close();
                    this.tooltip.ngbTooltip = this.tipAfterCopy;
                    this.tooltip.open();

                    // Reset the text
                    this.tooltip.ngbTooltip = this.tipBeforeCopy;
                }
            });
    }
}
