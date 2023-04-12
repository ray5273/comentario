import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { Dialog, DialogPositioning } from './dialog';

export class ForgotPasswordDialog extends Dialog {

    private _email?: Wrap<HTMLInputElement>;

    private constructor(parent: Wrap<any>, pos: DialogPositioning) {
        super(parent, 'Reset password', pos);
    }

    /**
     * Instantiate and show the dialog. Return a promise that resolves as soon as the dialog is closed.
     * @param parent Parent element for the dialog.
     * @param pos Positioning options..
     */
    static run(parent: Wrap<any>, pos: DialogPositioning): Promise<ForgotPasswordDialog> {
        const dlg = new ForgotPasswordDialog(parent, pos);
        return dlg.run(dlg);
    }

    /**
     * Entered email.
     */
    get email(): string {
        return this._email?.val || '';
    }

    override renderContent(): Wrap<any> {
        return UIToolkit.form(() => this.dismiss(true), () => this.dismiss())
            .append(
                UIToolkit.div('dialog-centered').inner('Enter your email below. If the email is known to us, we\'ll send you a password reset link.'),
                UIToolkit.div('input-group').append(this._email = UIToolkit.input('email', 'email', 'Email address', 'email', true)),
                UIToolkit.div('dialog-centered').append(UIToolkit.submit('Submit', false)));
    }

    override onShow(): void {
        this._email?.focus();
    }
}
