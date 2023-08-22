import { Wrap } from './element-wrap';
import { Dialog, DialogPositioning } from './dialog';
import { UIToolkit } from './ui-toolkit';

export class MarkdownHelp extends Dialog {

    private constructor(parent: Wrap<any>, pos: DialogPositioning) {
        super(parent, 'Markdown help', pos);
    }

    /**
     * Instantiate and show the dialog. Return a promise that resolves as soon as the dialog is closed.
     * @param parent Parent element for the dialog.
     * @param pos Positioning options.
     */
    static run(parent: Wrap<any>, pos: DialogPositioning): void {
        new MarkdownHelp(parent, pos).run(null);
    }

    override renderContent(): Wrap<any> {
        return UIToolkit.div('table-container')
            .append(
                Wrap.new('table')
                    .classes('table')
                    .append(
                        this.row('<i>italics</i>',                            'Surround text with <code>*asterisks*</code>'),
                        this.row('<b>bold</b>',                               'Surround text with <code>**double asterisks**</code>'),
                        this.row('<code>code</code>',                         'Surround text with <code>`backticks`</code>'),
                        this.row('<del>strikethrough</del>',                  'Surround text with <code>~~double tildes~~</code>'),
                        this.row('<a href="https://comentario.app">link</a>', '<code>[link](https://comentario.app)</code> or just a bare URL'),
                        this.row('<blockquote>quote</blockquote>',            'Prefix with <code>&gt;</code>'),
                        this.row('<ul><li>list</li></ul>',                    'Prefix with <code>*</code>'),
                    ),
                UIToolkit.div('dialog-centered')
                    .append(
                        Wrap.new('a')
                            .inner('Read more about Markdown')
                            // TODO this link doesn't work yet
                            .attr({href: 'https://docs.comentario.app/en/kb/markdown', target: '_blank'})));
    }

    private row(md: string, text: string): Wrap<any> {
        return Wrap.new('tr')
            .append(Wrap.new('td').html(md), Wrap.new('td').html(text));
    }
}
