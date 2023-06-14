import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { Dialog, DialogPositioning } from './dialog';
import {PageInfo, Principal, UserSettings} from './models';

export class SettingsDialog extends Dialog {

    private _cbNotifyModerator?: Wrap<HTMLInputElement>;
    private _cbNotifyReplies?: Wrap<HTMLInputElement>;

    private constructor(
        parent: Wrap<any>, pos: DialogPositioning,
        private readonly baseUrl: string,
        private readonly principal: Principal,
        private readonly pageInfo: PageInfo,
    ) {
        super(parent, `User settings for ${pageInfo.domainName}`, pos);
    }

    /**
     * Instantiate and show the dialog. Return a promise that resolves as soon as the dialog is closed.
     * @param parent Parent element for the dialog.
     * @param pos Positioning options.
     * @param baseUrl Base URL of the Comentario instance
     * @param principal Principal whose settings are being edited.
     * @param pageInfo Data about the current page.
     */
    static run(parent: Wrap<any>, pos: DialogPositioning, baseUrl: string, principal: Principal, pageInfo: PageInfo): Promise<SettingsDialog> {
        const dlg = new SettingsDialog(parent, pos, baseUrl, principal, pageInfo);
        return dlg.run(dlg);
    }

    /**
     * Entered settings.
     */
    get data(): UserSettings {
        return {
            notifyModerator: !!this._cbNotifyModerator?.isChecked,
            notifyReplies:   !!this._cbNotifyReplies?.isChecked,
        };
    }

    override renderContent(): Wrap<any> {
        return UIToolkit.form(() => this.dismiss(true), () => this.dismiss())
            .append(
                // Checkboxes
                UIToolkit.div('checkbox-group').append(
                    // Moderator notifications checkbox (only if the current commenter is a moderator)
                    this.principal.isModerator && UIToolkit.div('checkbox-container')
                        .append(
                            this._cbNotifyModerator = Wrap.new('input')
                                .id('cb-notify-moderator')
                                .attr({type: 'checkbox'})
                                .checked(this.principal.notifyModerator),
                            Wrap.new('label').attr({for: this._cbNotifyModerator.getAttr('id')}).inner('Moderator notifications')),
                    // Reply notifications checkbox
                    UIToolkit.div('checkbox-container')
                        .append(
                            this._cbNotifyReplies = Wrap.new('input')
                                .id('cb-notify-replies')
                                .attr({type: 'checkbox'})
                                .checked(this.principal.notifyReplies),
                            Wrap.new('label').attr({for: this._cbNotifyReplies.getAttr('id')}).inner('Reply notifications'))),
                // Submit button
                UIToolkit.div('dialog-centered').append(UIToolkit.submit('Save', false)),
                // Edit profile link
                Wrap.new('hr'),
                UIToolkit.div('dialog-centered').append(
                    Wrap.new('a')
                        .inner('Edit Comentario profile')
                        .attr({href: `${this.baseUrl}/en/manage/account/profile`, target: '_blank'})));
    }
}
