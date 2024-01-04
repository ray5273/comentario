import { Wrap } from './element-wrap';
import { Dialog, DialogPositioning } from './dialog';
import { UIToolkit } from './ui-toolkit';

export class ConfirmDialog extends Dialog {

    private btnOk?: Wrap<HTMLButtonElement>;

    private constructor(parent: Wrap<any>, pos: DialogPositioning, private readonly text: string) {
        super(parent, 'Confirm', pos);
    }

    /**
     * Instantiate and show the dialog. Return a promise that resolves as soon as the dialog is closed.
     * @param parent Parent element for the dialog.
     * @param pos Positioning options.
     * @param text Dialog text.
     */
    static async run(parent: Wrap<any>, pos: DialogPositioning, text: string): Promise<boolean> {
        const dlg = new ConfirmDialog(parent, pos, text);
        await dlg.run(null);
        return dlg.confirmed;
    }

    override renderContent(): Wrap<any> {
        this.btnOk = UIToolkit.button('OK', () => this.dismiss(true), 'btn-danger');
        return UIToolkit.div()
            .append(
                // Dialog text
                UIToolkit.div('dialog-centered').inner(this.text),
                // Button
                UIToolkit.div('dialog-centered').append(UIToolkit.button('Cancel', () => this.dismiss(), 'btn-link'), this.btnOk));
    }

    override onShow() {
        this.btnOk?.focus();
    }
}
