import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { Dialog, DialogPositioning } from './dialog';
import { AsyncProc, AsyncProcWithArg, Principal, TranslateFunc, UserSettings } from './models';

export class SettingsDialog extends Dialog {

    private _cbNotifyModerator?: Wrap<HTMLInputElement>;
    private _cbNotifyReplies?: Wrap<HTMLInputElement>;
    private _cbNotifyCommentStatus?: Wrap<HTMLInputElement>;
    private _btnSave?: Wrap<HTMLButtonElement>;

    private constructor(
        t: TranslateFunc,
        parent: Wrap<any>,
        pos: DialogPositioning,
        private readonly principal: Principal,
        private readonly onSave: AsyncProcWithArg<UserSettings>,
        private readonly onOpenProfile: AsyncProc,
    ) {
        super(t, parent, t('dlgTitleUserSettings'), pos);
    }

    /**
     * Instantiate and show the dialog. Return a promise that resolves as soon as the dialog is closed.
     * @param t Function for obtaining translated messages.
     * @param parent Parent element for the dialog.
     * @param pos Positioning options.
     * @param principal Principal whose settings are being edited.
     * @param onSave Callback for applying the changed settings.
     * @param onOpenProfile Callback for Edit Comentario profile click.
     */
    static run(t: TranslateFunc, parent: Wrap<any>, pos: DialogPositioning, principal: Principal, onSave: AsyncProcWithArg<UserSettings>, onOpenProfile: AsyncProc): Promise<SettingsDialog> {
        const dlg = new SettingsDialog(t, parent, pos, principal, onSave, onOpenProfile);
        return dlg.run(dlg);
    }

    override renderContent(): Wrap<any> {
        const isModerator = this.principal && (this.principal.isSuperuser || this.principal.isOwner || this.principal.isModerator);
        return UIToolkit.form(() => this.save(), () => this.dismiss())
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
                UIToolkit.div('dialog-centered')
                    .append(this._btnSave = UIToolkit.submit(this.t('actionSave'), false)),
                // Edit profile link (non-SSO only)
                !this.principal.isSso && Wrap.new('hr'),
                !this.principal.isSso &&
                    UIToolkit.div('dialog-centered')
                        .append(
                            UIToolkit.button(this.t('actionEditComentarioProfile'), btn => this.openProfile(btn), 'btn-link')
                                .append(UIToolkit.icon('newTab').classes('ms-1'))));
    }

    /**
     * Invoke the open profile callback while showing a spinner on the Open profile button.
     * @private
     */
    private async openProfile(btn: Wrap<HTMLButtonElement>) {
        await btn.spin(() => this.onOpenProfile());
        this.dismiss(false);
    }

    /**
     * Invoke the save callback while showing a spinner on the Save button.
     * @private
     */
    private async save() {
        // Show a spinner on the button while invoking the save callback
        await this._btnSave!.spin(() => this.onSave({
                notifyModerator:     !!this._cbNotifyModerator?.isChecked,
                notifyReplies:       !!this._cbNotifyReplies?.isChecked,
                notifyCommentStatus: !!this._cbNotifyCommentStatus?.isChecked,
            }));

        // Close the dialog
        this.dismiss(true);
    }
}
