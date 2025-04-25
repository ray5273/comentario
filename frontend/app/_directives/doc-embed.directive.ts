import { Directive, effect, ElementRef, input } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { ConfigService } from '../_services/config.service';
import { HTTP_ERROR_HANDLING } from '../_services/http-error-handler.interceptor';

@Directive({
    selector: '[appDocEmbed]',
})
export class DocEmbedDirective {

    /** URL of the documentation page to embed. */
    readonly appDocEmbed = input<string | undefined>();

    constructor(
        private readonly element: ElementRef,
        private readonly http: HttpClient,
        private readonly cfgSvc: ConfigService,
    ) {
        effect(() => this.render(this.appDocEmbed()));
    }

    private render(url?: string): void {
        if (!url) {
            return;
        }

        const e = this.element.nativeElement;

        // Do not bother requesting pages during an end-2-end test
        if (this.cfgSvc.isUnderTest) {
            e.innerHTML = `<div class="container py-5 m5-5 border rounded text-center">[${url}]</div>`;
            return;
        }

        // Load the document, suppressing errors (since it's a less important resource)
        this.http.get(url, {responseType: 'text', context: new HttpContext().set(HTTP_ERROR_HANDLING, false)})
            .subscribe({
                // Update the inner HTML of the element on success
                next: t => e.innerHTML = t,
                // Display error on failure
                error: (err: Error) => e.innerHTML = '<div class="container text-center alert alert-secondary fade-in">' +
                        `Could not load the resource at <a href="${url}" target="_blank" rel="noopener">${url}</a>:<br>` +
                        `<span class="small">${err.message}</span>` +
                    '</div>',
            });
    }
}
