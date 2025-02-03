import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { Dialog, DialogPositioning } from './dialog';
import { PageInfo, Principal, TranslateFunc } from './models';

export class RssDialog extends Dialog {

    private cbThisPage?: Wrap<HTMLInputElement>;
    private cbReplies?:  Wrap<HTMLInputElement>;
    private link?:       Wrap<HTMLAnchorElement>;

    private constructor(
        t: TranslateFunc,
        parent: Wrap<any>,
        pos: DialogPositioning,
        private readonly baseRssUrl: string,
        private readonly pageInfo: PageInfo,
        private readonly principal?: Principal,
    ) {
        super(t, parent, t('dlgTitleCommentRssFeed'), pos);
    }

    /**
     * Instantiate and show the dialog. Return a promise that resolves as soon as the dialog is closed.
     * @param t Function for obtaining translated messages.
     * @param parent Parent element for the dialog.
     * @param pos Positioning options.
     * @param baseRssUrl Base RSS feed URL, without any query params.
     * @param pageInfo Current page data.
     * @param principal Authenticated principal, if any.
     */
    static run(t: TranslateFunc, parent: Wrap<any>, pos: DialogPositioning, baseRssUrl: string, pageInfo: PageInfo, principal?: Principal): Promise<RssDialog> {
        const dlg = new RssDialog(t, parent, pos, baseRssUrl, pageInfo, principal);
        return dlg.run(dlg);
    }

    override renderContent(): Wrap<any> {
        const d = UIToolkit.div()
            .append(
                // Checkboxes
                UIToolkit.div('checkbox-group').append(
                    // Only this page
                    UIToolkit.div('checkbox-container')
                        .append(
                            this.cbThisPage = Wrap.new('input')
                                .id('cb-only-this-page')
                                .attr({type: 'checkbox'})
                                .checked(true)
                                .on('change', () => this.updateLink()),
                            Wrap.new('label').attr({for: this.cbThisPage.getAttr('id')}).inner(this.t('fieldOnlyThisPage'))),
                    // Only replies to your comments - when there's a principal
                    this.principal && UIToolkit.div('checkbox-container')
                        .append(
                            this.cbReplies = Wrap.new('input')
                                .id('cb-only-replies')
                                .attr({type: 'checkbox'})
                                .on('change', () => this.updateLink()),
                            Wrap.new('label').attr({for: this.cbReplies.getAttr('id')}).inner(this.t('fieldOnlyReplies'))),
                // RSS feed link
                Wrap.new('hr'),
                UIToolkit.div('dialog-centered').append(UIToolkit.span(this.t('labelUseRssLink') + ': ')),
                UIToolkit.div('dialog-centered').append(this.link = UIToolkit.a('', '', {noOpener: true, noReferrer: true}))));
        this.updateLink();
        return d;
    }

    /**
     * Update the href of the RSS link according to the currently selected options.
     * @private
     */
    private updateLink() {
        // Construct feed parameters
        const up = new URLSearchParams({domain: this.pageInfo.domainId});
        if (this.cbThisPage?.isChecked) {
            up.set('page', this.pageInfo.pageId);
        }
        if (this.principal && this.cbReplies?.isChecked) {
            up.set('replyToUser', this.principal.id);
        }

        // Update the link's href
        const href = this.baseRssUrl + '?' + up.toString();
        this.link?.inner(href).attr({href});
    }
}
