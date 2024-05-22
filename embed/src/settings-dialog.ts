import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { Dialog, DialogPositioning } from './dialog';
import { Principal, TranslateFunc, UserSettings } from './models';

export class SettingsDialog extends Dialog {

    private _cbNotifyModerator?: Wrap<HTMLInputElement>;
    private _cbNotifyReplies?: Wrap<HTMLInputElement>;
    private _cbNotifyCommentStatus?: Wrap<HTMLInputElement>;

    private constructor(
        t: TranslateFunc,
        parent: Wrap<any>,
        pos: DialogPositioning,
        private readonly principal: Principal,
        private readonly onOpenProfile: () => void,
    ) {
        super(t, parent, t('dlgTitleUserSettings'), pos);
    }

    /**
     * Instantiate and show the dialog. Return a promise that resolves as soon as the dialog is closed.
     * @param t Function for obtaining translated messages.
     * @param parent Parent element for the dialog.
     * @param pos Positioning options.
     * @param principal Principal whose settings are being edited.
     * @param onOpenProfile Callback for Edit Comentario profile click
     */
    static run(t: TranslateFunc, parent: Wrap<any>, pos: DialogPositioning, principal: Principal, onOpenProfile: () => void): Promise<SettingsDialog> {
        const dlg = new SettingsDialog(t, parent, pos, principal, onOpenProfile);
        return dlg.run(dlg);
    }

    /**
     * Entered settings.
     */
    get data(): UserSettings {
        return {
            notifyModerator:     !!this._cbNotifyModerator?.isChecked,
            notifyReplies:       !!this._cbNotifyReplies?.isChecked,
            notifyCommentStatus: !!this._cbNotifyCommentStatus?.isChecked,
        };
    }

    override renderContent(): Wrap<any> {
        const isModerator = this.principal && (this.principal.isSuperuser || this.principal.isOwner || this.principal.isModerator);
        return UIToolkit.form(() => this.dismiss(true), () => this.dismiss())
            .append(
                // Checkboxes
                UIToolkit.div('checkbox-group').append(
                    // Moderator notifications checkbox (only if the current commenter is a moderator)
                    isModerator && UIToolkit.div('checkbox-container')
                        .append(
                            this._cbNotifyModerator = Wrap.new('input')
                                .id('cb-notify-moderator')
                                .attr({type: 'checkbox'})
                                .checked(this.principal.notifyModerator),
                            Wrap.new('label').attr({for: this._cbNotifyModerator.getAttr('id')}).inner(this.t('fieldModNotifications'))),
                    // Reply notifications checkbox
                    UIToolkit.div('checkbox-container')
                        .append(
                            this._cbNotifyReplies = Wrap.new('input')
                                .id('cb-notify-replies')
                                .attr({type: 'checkbox'})
                                .checked(this.principal.notifyReplies),
                            Wrap.new('label').attr({for: this._cbNotifyReplies.getAttr('id')}).inner(this.t('fieldReplyNotifications'))),
                    // Comment status notifications checkbox
                    UIToolkit.div('checkbox-container')
                        .append(
                            this._cbNotifyCommentStatus = Wrap.new('input')
                                .id('cb-notify-comment-status')
                                .attr({type: 'checkbox'})
                                .checked(this.principal.notifyCommentStatus),
                            Wrap.new('label').attr({for: this._cbNotifyCommentStatus.getAttr('id')}).inner(this.t('fieldComStatusNotifications')))),
                // Submit button
                UIToolkit.div('dialog-centered').append(UIToolkit.submit(this.t('actionSave'), false)),
                // Edit profile link (non-SSO only)
                !this.principal.isSso && Wrap.new('hr'),
                !this.principal.isSso &&
                    UIToolkit.div('dialog-centered')
                        .append(
                            UIToolkit.button(this.t('actionEditComentarioProfile'), () => this.openProfile(), 'btn-link')
                                .append(UIToolkit.icon('newTab').classes('ms-1'))));
    }

    private openProfile() {
        this.dismiss(false);
        this.onOpenProfile();
    }
}
