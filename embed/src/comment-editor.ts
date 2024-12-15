import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { AsyncProcWithArg, PageInfo, TranslateFunc } from './models';
import { Utils } from './utils';
import { BlockEditorCommand, EditorCommand, InlineEditorCommand } from './editor-command';

export type CommentEditorPreviewCallback = (markdown: string) => Promise<string>;

export class CommentEditor extends Wrap<HTMLFormElement>{

    private readonly textarea:   Wrap<HTMLTextAreaElement>;
    private readonly preview:    Wrap<HTMLDivElement>;
    private readonly btnCancel:  Wrap<HTMLButtonElement>;
    private readonly btnPreview: Wrap<HTMLButtonElement>;
    private readonly btnSubmit:  Wrap<HTMLButtonElement>;
    private readonly toolbar:    Wrap<HTMLDivElement>;
    private readonly commands = this.createCommands();

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
        private readonly onCancel: AsyncProcWithArg<CommentEditor>,
        private readonly onSubmit: AsyncProcWithArg<CommentEditor>,
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
                    .attr({name: 'comentario-comment-editor', maxlength: String(pageInfo.maxCommentLength)})
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

        // Install keyboard shortcuts
        this.installShortcuts();

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
                html = await this.btnPreview.spin(() => this.onPreview(this.markdown));
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
     * Create and return a list of applicable editor commands.
     * @private
     */
    private createCommands(): EditorCommand[] {
        const r: EditorCommand[] = [];
        // Use Cmd+Key combinations on Mac, Ctrl+Key otherwise
        const keyCtrl  = !UIToolkit.isMac;
        const keyMeta  = UIToolkit.isMac;
        const keyShift = true;
        const placeholder = this.t('sampleText');
        r.push(
            new InlineEditorCommand({
                icon:    'bold',
                titleId: 'btnBold',
                pattern: '**$**{}',
                keyCtrl,
                keyMeta,
                keyCode: 'KeyB',
                placeholder,
            }),
            new InlineEditorCommand({
                icon:    'italic',
                titleId: 'btnItalic',
                pattern: '*$*{}',
                keyCtrl,
                keyMeta,
                keyCode: 'KeyI',
                placeholder,
            }),
            new InlineEditorCommand({
                icon:    'strikethrough',
                titleId: 'btnStrikethrough',
                pattern: '~~$~~{}',
                keyCtrl,
                keyMeta,
                keyShift,
                keyCode: 'KeyX',
                placeholder,
            }));
        if (this.pageInfo.markdownLinksEnabled) {
            r.push(
                new InlineEditorCommand({
                    icon:    'link',
                    titleId: 'btnLink',
                    pattern: '[$]({https://example.com})',
                    keyCtrl,
                    keyMeta,
                    keyCode: 'KeyK',
                    placeholder,
                }));
        }
        r.push(
            new BlockEditorCommand({
                icon:    'quote',
                titleId: 'btnQuote',
                pattern: '> ',
                keyCtrl,
                keyMeta,
                keyShift,
                keyCode: 'Period',
                keyName: '.',
            }),
            new InlineEditorCommand({
                icon:    'code',
                titleId: 'btnCode',
                pattern: '`$`{}',
                keyCtrl,
                keyMeta,
                keyCode: 'KeyE',
                placeholder,
            }));
        if (this.pageInfo.markdownImagesEnabled) {
            r.push(
                new InlineEditorCommand({
                    icon:        'image',
                    titleId:     'btnImage',
                    pattern:     '![]($){}',
                    placeholder: 'https://example.com/image.png',
                }));
        }
        if (this.pageInfo.markdownTablesEnabled) {
            r.push(
                new InlineEditorCommand({
                    icon:        'table',
                    titleId:     'btnTable',
                    pattern:     '\n| $ | {Heading} |\n|---------|---------|\n| Text    | Text    |\n',
                    placeholder: 'Heading',
                }));
        }
        r.push(
            new BlockEditorCommand({
                icon:    'bulletList',
                titleId: 'btnBulletList',
                pattern: '* ',
                keyCtrl,
                keyMeta,
                keyShift,
                keyCode: 'Digit8',
            }),
            new BlockEditorCommand({
                icon:    'numberedList',
                titleId: 'btnNumberedList',
                pattern: '1. ',
                keyCtrl,
                keyMeta,
                keyShift,
                keyCode: 'Digit7',
            }));
        return r;
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
        this.btnSubmit.disabled(cannotPost).setClasses(this.submitting, 'spinner');

        // Hide the textarea and show the preview in the preview mode
        this.textarea.setClasses(this.previewing, 'hidden');
        this.preview.setClasses(!this.previewing, 'hidden');
    }

    private renderToolbar(): Wrap<HTMLDivElement> {
        return UIToolkit.div('toolbar').append(
            // Left section: add a button for each command
            UIToolkit.div('toolbar-section')
                .append(...this.commands.map(
                    c => UIToolkit.toolButton(c.icon, this.t(c.titleId) + c.keyTitle, () => this.runCommand(c)))),
            // Right section
            UIToolkit.div('toolbar-section').append(
                // Editor help link
                UIToolkit.a('', Utils.joinUrl(this.pageInfo.baseDocsUrl, this.pageInfo.defaultLangId, 'kb/comment-editor/'))
                    .classes('btn', 'btn-tool')
                    .attr({title: this.t('btnEditorHelp')})
                    .append(UIToolkit.icon('help')),
            ));
    }

    /**
     * Install keyboard shortcuts on the editor.
     * @private
     */
    private installShortcuts() {
        this.textarea.keydown((_, e) => {
            // Try to find a command that matches the key combination
            const cmd = this.commands.find(c => c.matchesKeyEvent(e));
            if (cmd) {
                // Command found: cancel the default handling of the event in the browser
                e.preventDefault();
                e.stopPropagation();

                // Invoke the command
                this.runCommand(cmd);
            }
        });
    }

    /**
     * Run the given command against the current editor.
     * @param c Command to run.
     * @private
     */
    private runCommand(c: EditorCommand) {
        // Apply the command
        c.apply(this.textarea.element);

        // Update controls to reflect changes in the text
        this.updateControls();

        // Re-focus the textarea
        this.textarea.focus();
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
