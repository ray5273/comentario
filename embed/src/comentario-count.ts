import { ComentarioBase, WebComponent } from './comentario-base';
import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';

/**
 * Web component implementing the <comentario-count> element. It recognises the following optional attributes:
 * * `path`        path on the current domain to fetch comment count for. Defaults to the current page's path.
 * * `placeholder` text to display before the count becomes available. Defaults to an empty string.
 * * `error-text`   text to display if fetching the count fails for any reason. Defaults to `'?'`.
 * * `zero-text`    text to display if count is zero. Defaults to the actual number (i.e. `'0'`) with any prefix/suffix.
 * * `prefix`      text that prefixes a successfully fetched, non-zero count. Defaults to an empty string.
 * * `suffix`      text that suffixes a successfully fetched, non-zero count. Defaults to an empty string.
 */
export class ComentarioCount extends ComentarioBase implements WebComponent {

    // noinspection JSUnusedGlobalSymbols - part of the WebComponent implementation
    static observedAttributes = ['path', 'placeholder', 'error-text', 'zero-text', 'prefix', 'suffix'];

    /** The root element fo the component. */
    private root?: Wrap<HTMLSpanElement>;

    /** Number of comments retrieved from Comentario. */
    private _count?: number;

    /** Delay timer for rendering attribute changes. */
    private _timer?: ReturnType<typeof setTimeout>;

    connectedCallback() {
        // Create a root element
        this.root?.remove();
        this.root = UIToolkit.span(this.getAttribute('placeholder') ?? '', 'comment-count').appendTo(new Wrap(this));

        // Update the widget
        this.update(true);
    }

    disconnectedCallback() {
        // Clean up
        this.root?.inner('');
    }

    attributeChangedCallback(name: string) {
        // Kill the delay timer, if any
        this.killTimer();

        // Schedule an update after a short delay, to minimise flicker and content reflows. We only need to refetch if
        // the path attribute has changed
        this._timer = setTimeout(() => this.update(name === 'path'), 100);
    }

    /**
     * Format the count figure according to the rules defined by the element's attributes.
     */
    get formattedCount(): string {
        if (this._count === undefined) {
            return this.getAttribute('error-text') ?? '?';
        } else if (this._count === 0 && this.hasAttribute('zero-text')) {
            return this.getAttribute('zero-text')!;
        } else {
            return (this.getAttribute('prefix') ?? '') + String(this._count) + (this.getAttribute('suffix') ?? '');
        }
    }

    /**
     * Update the displayed comment count.
     * @param refetch Whether to also refetch the comment count from the backend.
     */
    async update(refetch: boolean): Promise<void> {
        // Kill the delay timer, if any
        this.killTimer();

        // Refetch comment count, if necessary
        if (refetch) {
            await this.fetchCount();
        }

        // Update the element text
        this.root?.inner(this.formattedCount);
    }

    /**
     * Request the comment count for the currently specified page path, and update the _count property accordingly.
     * @private
     */
    private async fetchCount(): Promise<void> {
        try {
            const path = this.getAttribute('path') || this.location.pathname;
            const r = await this.apiService.commentCount(this.location.host, [path]);
            const cnt = r.commentCounts[path];
            if (cnt != null) {
                this._count = cnt;
                return;
            }
        } catch {
            // Ignore
        }
        this._count = undefined;
    }

    /**
     * Kill the delay timer, if any.
     * @private
     */
    private killTimer() {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = undefined;
        }
    }
}
