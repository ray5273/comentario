import { Wrap } from './element-wrap';
import { Dialog, DialogPositioning } from './dialog';
import { UIToolkit } from './ui-toolkit';
import { TranslateFunc } from './models';

export class PopupBlockedDialog extends Dialog {

    private btnRetry?: Wrap<HTMLButtonElement>;

    private constructor(t: TranslateFunc, parent: Wrap<any>, pos: DialogPositioning) {
        super(t, parent, t('dlgTitlePopupBlocked'), pos);
    }

    /**
     * Instantiate and show the dialog. Return a promise that resolves as soon as the dialog is closed.
     * @param t Function for obtaining translated messages.
     * @param parent Parent element for the dialog.
     * @param pos Positioning options.
     */
    static async run(t: TranslateFunc, parent: Wrap<any>, pos: DialogPositioning): Promise<boolean> {
        const dlg = new PopupBlockedDialog(t, parent, pos);
        await dlg.run(null);
        return dlg.confirmed;
    }

    override renderContent(): Wrap<any> {
        return UIToolkit.div()
            .append(
                // Dialog text
                UIToolkit.div('dialog-centered').inner(this.t('popupWasBlocked')),
                // Button
                UIToolkit.div('dialog-centered').append(
                    this.btnRetry = UIToolkit.button(this.t('actionRetry'), () => this.dismiss(true), 'btn-primary')));
    }

    override onShow() {
        this.btnRetry?.focus();
    }
}
