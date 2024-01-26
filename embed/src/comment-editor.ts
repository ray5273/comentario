import { Wrap } from './element-wrap';
import { IconName, UIToolkit } from './ui-toolkit';
import { InstanceConfig } from './config';

export type CommentEditorCallback = (ce: CommentEditor) => void;
export type CommentEditorPreviewCallback = (markdown: string) => Promise<string>;

export class CommentEditor extends Wrap<HTMLFormElement>{

    private readonly textarea:   Wrap<HTMLTextAreaElement>;
    private readonly preview:    Wrap<HTMLDivElement>;
    private readonly btnPreview: Wrap<HTMLButtonElement>;
    private readonly btnSubmit:  Wrap<HTMLButtonElement>;
    private previewing = false;

    /**
     * Create a new editor for editing comment text.
     * @param parent Parent element to host the editor.
     * @param isEdit Whether it's adding a new comment (false) or editing an existing one (true).
     * @param initialText Initial text to insert into the editor.
     * @param config Comentario configuration obtained from the backend.
     * @param onCancel Cancel callback.
     * @param onSubmit Submit callback.
     * @param onPreview Preview callback.
     */
    constructor(
        private readonly parent: Wrap<any>,
        isEdit: boolean,
        initialText: string,
        private readonly config: InstanceConfig,
        onCancel: CommentEditorCallback,
        onSubmit: CommentEditorCallback,
        private readonly onPreview: CommentEditorPreviewCallback,
    ) {
        super(UIToolkit.form(() => onSubmit(this), () => onCancel(this)).element);

        // Set up the form
        this.classes('comment-editor')
            .append(
                // Toolbar
                this.renderToolbar(),
                // Textarea
                this.textarea = UIToolkit.textarea(null, true, true)
                    .attr({name: 'comentario-comment-editor', maxlength: '4096'})
                    .value(initialText)
                    .on('input', () => this.textChanged()),
                // Preview
                this.preview = UIToolkit.div('comment-editor-preview', 'hidden'),
                // Editor footer
                UIToolkit.div('comment-editor-footer')
                    .append(
                        // Cancel
                        UIToolkit.button('Cancel', () => onCancel(this), 'btn-link'),
                        // Preview
                        this.btnPreview = UIToolkit.button('Preview', () => this.togglePreview(), 'btn-secondary'),
                        // Submit
                        this.btnSubmit = UIToolkit.submit(isEdit ? 'Save Changes' : 'Add Comment', false),
                    ));

        // Update the parent
        this.parent.classes('editor-inserted').prepend(this);

        // Update the buttons
        this.textChanged();

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

        // Hide the textarea and show the preview in the preview mode
        this.textarea.setClasses(this.previewing, 'hidden');
        this.preview.setClasses(!this.previewing, 'hidden');

        // Update the button
        this.btnPreview.setClasses(this.previewing, 'btn-active');

        // Request a comment text rendering
        let html = '';
        if (this.previewing) {
            try {
                html = await this.onPreview(this.markdown);
            } catch (e: any) {
                html = `Preview failed: ${e.message || '(unknown error)'}`;
            }
        }
        this.preview.html(html);

        // Focus the editor after leaving the preview
        if (!this.previewing) {
            this.textarea.focus();
        }
    }

    private textChanged() {
        // Disable the preview/submit buttons if the text is empty
        const attr = {disabled: this.markdown ? undefined : 'disabled'};
        this.btnPreview.attr(attr);
        this.btnSubmit.attr(attr);
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
        let sel = text.substring(is1, is2) || placeholder || 'text';
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
        this.textChanged();
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
        this.textChanged();
        ta.focus();
    }

    private toolButton(icon: IconName, title: string, onClick: () => void): Wrap<HTMLButtonElement> {
        return UIToolkit.iconButton(icon, title, onClick, 'btn-link').attr({tabindex: '-1'});
    }

    private renderToolbar(): Wrap<HTMLDivElement> {
        return UIToolkit.div('toolbar').append(
            // Left section
            UIToolkit.div('toolbar-section').append(
                this.toolButton('bold',          'Bold',          () => this.applyInlinePattern('**$**{}')),
                this.toolButton('italic',        'Italic',        () => this.applyInlinePattern('*$*{}')),
                this.toolButton('strikethrough', 'Strikethrough', () => this.applyInlinePattern('~~$~~{}')),
                this.config.dynamic.linksEnabled &&
                    this.toolButton('link',      'Link',          () => this.applyInlinePattern('[$]({https://example.com})', 'Link text')),
                this.toolButton('quote',         'Quote',         () => this.applyBlockPattern('> ')),
                this.toolButton('code',          'Code',          () => this.applyInlinePattern('`$`{}')),
                this.config.dynamic.imagesEnabled &&
                    this.toolButton('image',     'Image',         () => this.applyInlinePattern('![]($){}', 'https://example.com/image.png')),
                this.config.dynamic.tablesEnabled &&
                    this.toolButton('table',     'Table',         () => this.applyInlinePattern('\n| $ | {Heading} |\n|---------|---------|\n| Text    | Text    |\n', 'Heading')),
                this.toolButton('bulletList',    'Bullet list',   () => this.applyBlockPattern('* ')),
                this.toolButton('numberedList',  'Numbered list', () => this.applyBlockPattern('1. ')),
            ),
            // Right section
            UIToolkit.div('toolbar-section').append(
                // Markdown help link
                UIToolkit.a('', this.config.docsUrl('kb/markdown/'))
                    .classes('btn', 'btn-link')
                    .attr({title: 'Markdown help'})
                    .append(UIToolkit.icon('help')),
            ));
    }
}
