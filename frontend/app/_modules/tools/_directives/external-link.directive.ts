import { Directive, effect, ElementRef, input, OnInit, Renderer2 } from '@angular/core';

/**
 * Directive that forces a link to open in a new tab.
 */
@Directive({
    selector: 'a[appExternalLink]',
})
export class ExternalLinkDirective implements OnInit {

    /** The URL to point to. */
    readonly appExternalLink = input<string | null>();

    constructor(
        private readonly element: ElementRef<HTMLAnchorElement>,
        private readonly renderer: Renderer2,
    ) {
        effect(() => this.renderer.setAttribute(this.element.nativeElement, 'href', this.appExternalLink() ?? ''));
    }

    ngOnInit(): void {
        const a = this.element.nativeElement;
        this.renderer.setAttribute(a, 'target', '_blank');
        this.renderer.setAttribute(a, 'rel',    'noopener noreferrer');
        this.renderer.setAttribute(a, 'title',  $localize`Open in new tab`);
        this.renderer.addClass(a, 'external-link');
    }
}
