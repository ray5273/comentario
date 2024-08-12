import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { PageInfo, TranslateFunc } from './models';
import { Utils } from './utils';

export type CommentEditorCallback = (ce: CommentEditor) => Promise<void>;
export type CommentEditorPreviewCallback = (markdown: string) => Promise<string>;

export class CommentEditor extends Wrap<HTMLFormElement>{

    private readonly textarea:   Wrap<HTMLTextAreaElement>;
    private readonly preview:    Wrap<HTMLDivElement>;
    private readonly btnCancel:  Wrap<HTMLButtonElement>;
    private readonly btnPreview: Wrap<HTMLButtonElement>;
    private readonly btnSubmit:  Wrap<HTMLButtonElement>;
    private readonly toolbar:    Wrap<HTMLDivElement>;
    private previewing = false;
    private submitting = false;

    /**
     * Create a new editor for editing comment text.
     * @param t Function for obtaining translated messages.
     * @param parent Parent element to host the editor.
     * @param isEdit Whether it's adding a new comment (false) or editing an existing one (true).
     * @param initialText Initial text to insert into the editor.
     * @param pageInfo Current page data.
     * @param onCancel Cancel callback.
     * @param onSubmit Submit callback.
     * @param onPreview Preview callback.
     */
    constructor(
        private readonly t: TranslateFunc,
        private readonly parent: Wrap<any>,
        isEdit: boolean,
        initialText: string,
        private readonly pageInfo: PageInfo,
        private readonly onCancel: CommentEditorCallback,
        private readonly onSubmit: CommentEditorCallback,
        private readonly onPreview: CommentEditorPreviewCallback,
    ) {
        super(UIToolkit.form(() => this.submitEdit(), () => this.cancelEdit()).element);

        // Render the toolbar
        this.toolbar = this.renderToolbar();

        // Set up the form
        this.classes('comment-editor')
            .append(
                // Toolbar
                this.toolbar,
                // Textarea
                this.textarea = UIToolkit.textarea(null, true, true)
                    .attr({name: 'comentario-comment-editor', maxlength: '4096'})
                    .value(initialText)
                    .on('input', () => this.updateControls()),
                // Preview
                this.preview = UIToolkit.div('comment-editor-preview', 'hidden'),
                // Editor footer
                UIToolkit.div('comment-editor-footer')
                    .append(
                        // Cancel
                        this.btnCancel = UIToolkit.button(this.t('actionCancel'), () => onCancel(this), 'btn-link'),
                        // Preview
                        this.btnPreview = UIToolkit.button(this.t('actionPreview'), () => this.togglePreview(), 'btn-secondary'),
                        // Submit
                        this.btnSubmit = UIToolkit.submit(this.t(isEdit ? 'actionSave' : 'actionAddComment'), false),
                    ));

        // Update the parent
        this.parent.classes('editor-inserted').prepend(this);

        // Update the buttons
        this.updateControls();

        // Focus the textarea
        this.textarea.focus();
    }

    /**
     * Markdown text entered in the editor, trimmed of all leading and trailing whitespace.
     */
    get markdown(): string {
        return this.textarea.val.trim();
    }

    /**
     * Update the parent on editor removal.
     */
    override remove(): CommentEditor {
        this.parent.noClasses('editor-inserted');
        return super.remove() as CommentEditor;
    }

    private async togglePreview() {
        // Toggle the value
        this.previewing = !this.previewing;

        // Request a comment text rendering
        let html = '';
        if (this.previewing) {
            try {
                html = await this.onPreview(this.markdown);
            } catch (e: any) {
                html = `${this.t('previewFailed')}: ${e.message || '(unknown error)'}`;
            }
        }
        this.preview.html(html);

        // Update control states
        this.updateControls();

        // Focus the editor after leaving the preview
        if (!this.previewing) {
            this.textarea.focus();
        }
    }

    /**
     * Update the editor controls' state according to the current situation.
     * @private
     */
    private updateControls() {
        // Disable the toolbar while previewing or submitting
        this.toolbar.setClasses(this.previewing || this.submitting, 'disabled');

        // Disable the textarea and the Cancel button during submission
        this.textarea.disabled(this.submitting);
        this.btnCancel.disabled(this.submitting);

        // Disable the Preview/Submit buttons if the text is empty or during submission
        const cannotPost = !this.markdown || this.submitting;
        this.btnPreview.disabled(cannotPost).setClasses(this.previewing, 'btn-active');
        this.btnSubmit.disabled(cannotPost);

        // Hide the textarea and show the preview in the preview mode
        this.textarea.setClasses(this.previewing, 'hidden');
        this.preview.setClasses(!this.previewing, 'hidden');
    }

    /**
     * Apply the given "inline" pattern to the current editor selection.
     * @param pattern Pattern that provides the rule for transforming the selection:
     *   * `$` is replaced with the selected text, if any, or with a placeholder otherwise
     *   * `{}` denotes the new selection boundaries. Only used when there was a selection, otherwise the inserted
     *     placeholder is selected
     * @param placeholder Text to use when no selection. Defaults to 'text'.
     * @private
     */
    private applyInlinePattern(pattern: string, placeholder?: string) {
        // Fetch the selected text
        const ta = this.textarea.element;
        const is1 = ta.selectionStart, is2 = ta.selectionEnd;
        const text = ta.value;
        let sel = text.substring(is1, is2) || placeholder || this.t('sampleText');
        const selLen = sel.length;

        // Parse the pattern
        const ip$ = pattern.indexOf('$');
        let ips1 = pattern.indexOf('{'), ips2 = pattern.indexOf('}');

        // Compose the replacement
        sel = pattern.substring(0, ip$) + // Part before the '$'
            sel +                                // The selection (or the placeholder)
            pattern.substring(ip$+1, ips1) +     // Part between the '$' and the '{'
            pattern.substring(ips1+1, ips2) +    // Part between the '{' and the '}'
            pattern.substring(ips2+1);           // The rest of the pattern beyond the '}'

        // Calculate the new selection boundaries. If there was no selection, select the inserted placeholder
        if (is2 <= is1 + 1) {
            ips1 = is1 + ip$;
            ips2 = ips1 + selLen;
        } else {
            // Shift the selection boundaries accordingly otherwise
            ips1 += is1 + selLen - 1; // Account for the '$' (let's assume it's always left of the '{')
            ips2 += is1 + selLen - 2; // Account for '$' and '{'
        }

        // Replace the selected text with the processed pattern
        ta.setRangeText(sel);
        ta.setSelectionRange(ips1, ips2);
        this.updateControls();
        ta.focus();
    }

    /**
     * Apply the given "block" pattern to the current editor selection.
     * @param pattern Pattern that gets inserted at the beginning of the line.
     * @private
     */
    private applyBlockPattern(pattern: string) {
        // Fetch the selected text
        const ta = this.textarea.element;
        const iStart = ta.selectionStart;
        let text = ta.value;
        const pLen = pattern.length;

        // Rewind selection start to the nearest line start
        let iPos = iStart;
        while (iPos > 0 && !['\r', '\n'].includes(text.charAt(iPos - 1))) {
            iPos--;
        }

        // Insert the pattern at every line's beginning within the selection range
        let iEnd = ta.selectionEnd;
        do {
            text = text.substring(0, iPos) + pattern + text.substring(iPos);

            // Search for the next linebreak, starting after the insertion point
            if ((iPos = text.indexOf('\n', iPos + pLen)) < 0) {
                break;
            }

            // We're going to insert the pattern AFTER the linebreak
            iPos++;

            // The end position must shift as the text grows
            iEnd += pLen;
        } while (iPos < iEnd);

        // Replace the text
        ta.value = text;

        // Set the cursor at the original position within the text
        ta.setSelectionRange(iStart + pLen, iStart + pLen);
        this.updateControls();
        ta.focus();
    }

    private renderToolbar(): Wrap<HTMLDivElement> {
        return UIToolkit.div('toolbar').append(
            // Left section
            UIToolkit.div('toolbar-section').append(
                UIToolkit.toolButton('bold',          this.t('btnBold'),          () => this.applyInlinePattern('**$**{}')),
                UIToolkit.toolButton('italic',        this.t('btnItalic'),        () => this.applyInlinePattern('*$*{}')),
                UIToolkit.toolButton('strikethrough', this.t('btnStrikethrough'), () => this.applyInlinePattern('~~$~~{}')),
                this.pageInfo.markdownLinksEnabled &&
                    UIToolkit.toolButton('link',      this.t('btnLink'),          () => this.applyInlinePattern('[$]({https://example.com})', this.t('sampleText'))),
                UIToolkit.toolButton('quote',         this.t('btnQuote'),         () => this.applyBlockPattern('> ')),
                UIToolkit.toolButton('code',          this.t('btnCode'),          () => this.applyInlinePattern('`$`{}')),
                this.pageInfo.markdownImagesEnabled &&
                    UIToolkit.toolButton('image',     this.t('btnImage'),         () => this.applyInlinePattern('![]($){}', 'https://example.com/image.png')),
                this.pageInfo.markdownTablesEnabled &&
                    UIToolkit.toolButton('table',     this.t('btnTable'),         () => this.applyInlinePattern('\n| $ | {Heading} |\n|---------|---------|\n| Text    | Text    |\n', 'Heading')),
                UIToolkit.toolButton('bulletList',    this.t('btnBulletList'),    () => this.applyBlockPattern('* ')),
                UIToolkit.toolButton('numberedList',  this.t('btnNumberedList'),  () => this.applyBlockPattern('1. ')),
            ),
            // Right section
            UIToolkit.div('toolbar-section').append(
                // Markdown help link
                UIToolkit.a('', Utils.joinUrl(this.pageInfo.baseDocsUrl, this.pageInfo.defaultLangId, 'kb/markdown/'))
                    .classes('btn', 'btn-tool')
                    .attr({title: this.t('btnMarkdownHelp')})
                    .append(UIToolkit.icon('help')),
            ));
    }

    /**
     * Cancel the editor.
     * @private
     */
    private cancelEdit() {
        // Ignore while submitting
        if (this.submitting) {
            return;
        }

        // Invoke the callback
        this.onCancel(this);
    }

    /**
     * Submit the form.
     * @private
     */
    private async submitEdit(): Promise<void> {
        // Don't allow resubmissions
        if (this.submitting) {
            return;
        }

        // Disable the toolbar and the buttons
        this.submitting = true;
        this.updateControls();
        try {
            // Invoke the callback
            await this.onSubmit(this);
        } finally {
            this.submitting = false;
            this.updateControls();
        }
    }
}
