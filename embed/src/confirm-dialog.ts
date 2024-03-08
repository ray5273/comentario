import { Wrap } from './element-wrap';
import { Dialog, DialogPositioning } from './dialog';
import { UIToolkit } from './ui-toolkit';
import { TranslateFunc } from './models';

export class ConfirmDialog extends Dialog {

    private btnOk?: Wrap<HTMLButtonElement>;

    private constructor(t: TranslateFunc, parent: Wrap<any>, pos: DialogPositioning, private readonly text: string) {
        super(t, parent, t('dlgTitleConfirm'), pos);
    }

    /**
     * Instantiate and show the dialog. Return a promise that resolves as soon as the dialog is closed.
     * @param t Function for obtaining translated messages.
     * @param parent Parent element for the dialog.
     * @param pos Positioning options.
     * @param text Dialog text.
     */
    static async run(t: TranslateFunc, parent: Wrap<any>, pos: DialogPositioning, text: string): Promise<boolean> {
        const dlg = new ConfirmDialog(t, parent, pos, text);
        await dlg.run(null);
        return dlg.confirmed;
    }

    override renderContent(): Wrap<any> {
        this.btnOk = UIToolkit.button(this.t('actionOk'), () => this.dismiss(true), 'btn-danger');
        return UIToolkit.div()
            .append(
                // Dialog text
                UIToolkit.div('dialog-centered').inner(this.text),
                // Button
                UIToolkit.div('dialog-centered').append(UIToolkit.button(this.t('actionCancel'), () => this.dismiss(), 'btn-link'), this.btnOk));
    }

    override onShow() {
        this.btnOk?.focus();
    }
}
