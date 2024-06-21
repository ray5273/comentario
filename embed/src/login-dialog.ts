import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { Dialog, DialogPositioning } from './dialog';
import { LoginChoice, LoginData, PageInfo, TranslateFunc } from './models';

export class LoginDialog extends Dialog {

    private _email?: Wrap<HTMLInputElement>;
    private _pwd?: Wrap<HTMLInputElement>;
    private _userName?: Wrap<HTMLInputElement>;
    private _choice = LoginChoice.localAuth;
    private _idp?: string;

    private constructor(
        t: TranslateFunc,
        parent: Wrap<any>,
        pos: DialogPositioning,
        private readonly baseUrl: string,
        private readonly pageInfo: PageInfo,
    ) {
        super(t, parent, t('dlgTitleLogIn'), pos);
    }

    /**
     * Entered email.
     */
    get email(): string {
        return this._email?.val || '';
    }

    /**
     * Entered password.
     */
    get password(): string {
        return this._pwd?.val || '';
    }

    /**
     * Chosen/entered data.
     */
    get data(): LoginData {
        return {
            choice:   this._choice,
            idp:      this._idp,
            email:    this._email?.val,
            password: this._pwd?.val,
            userName: this._userName?.val,
        };
    }

    /**
     * Instantiate and show the dialog. Return a promise that resolves as soon as the dialog is closed.
     * @param t Function for obtaining translated messages.
     * @param parent Parent element for the dialog.
     * @param pos Positioning options.
     * @param baseUrl Base URL of the Comentario instance
     * @param pageInfo Current page data.
     */
    static run(t: TranslateFunc, parent: Wrap<any>, pos: DialogPositioning, baseUrl: string, pageInfo: PageInfo): Promise<LoginDialog> {
        const dlg = new LoginDialog(t, parent, pos, baseUrl, pageInfo);
        return dlg.run(dlg);
    }

    override renderContent(): Wrap<any> {
        const sections: Wrap<any>[] = [];

        // SSO/OAuth buttons
        if (this.pageInfo.authSso || this.pageInfo.idps?.length) {
            sections.push(
                // Subtitle
                UIToolkit.div('dialog-centered')
                    .inner(this.t('loginWith'))
                    .append(
                        UIToolkit.div('oauth-buttons')
                            .append(
                                // SSO button
                                this.pageInfo.authSso &&
                                    UIToolkit.button(this.t('actionSso'), () => this.dismissWith(LoginChoice.federatedAuth, 'sso'), 'btn-sso'),
                                // OAuth buttons
                                ...this.pageInfo.idps?.map(idp =>
                                    UIToolkit.button(
                                        idp.name,
                                        () => this.dismissWith(LoginChoice.federatedAuth, idp.id),
                                        `btn-${idp.id.startsWith('oidc:') ? 'dark' : idp.id}`)) ??
                                [])));
        }

        // If there's a local login option, create a login form
        if (this.pageInfo.authLocal) {
            // Create inputs
            this._email = UIToolkit.input('email',    'email',    'email@example.com',     'email',            true).attr({maxlength: '254'});
            this._pwd   = UIToolkit.input('password', 'password', this.t('fieldPassword'), 'current-password', true).attr({maxlength: '63'});

            // Add a form with the inputs to the dialog
            sections.push(
                UIToolkit.form(() => this.dismiss(true), () => this.dismiss())
                    .id('login-form')
                    .append(
                        // Subtitle
                        UIToolkit.div('dialog-centered').inner(this.t('loginViaLocalAuth')),
                        // Email
                        UIToolkit.div('input-group').append(this._email),
                        // Password
                        UIToolkit.div('input-group').append(this._pwd, UIToolkit.submit(this.t('actionLogIn'), true)),
                        // Forgot password link
                        UIToolkit.div('dialog-centered')
                            .append(
                                UIToolkit.a(this.t('forgotPasswordLink'), `${this.baseUrl}/en/auth/forgotPassword`)
                                    .append(UIToolkit.icon('newTab').classes('ms-1')))));
        }

        // Signup
        if (this.pageInfo.localSignupEnabled) {
            sections.push(
                UIToolkit.div('dialog-centered')
                    .inner(this.t('noAccountYet'))
                    .append(UIToolkit.button(this.t('actionSignUpLink'), () => this.dismissWith(LoginChoice.signup), 'btn-secondary', 'ms-2')));
        }

        // Unregistered commenting
        if (this.pageInfo.authAnonymous) {
            // Put the input on another form to allow submission with Enter/Ctrl+Enter
            sections.push(
                UIToolkit.form(() => this.dismissWith(LoginChoice.unregistered), () => this.dismiss())
                    .id('unregistered-form')
                    .append(
                        // Unregistered commenting text
                        UIToolkit.div('dialog-centered').inner(this.t('notWillingToSignup')),
                        // Commenter name
                        UIToolkit.div('input-group')
                            .append(
                                this._userName = UIToolkit.input('userName', 'text', this.t('fieldYourNameOptional'), 'name', false)
                                    .attr({maxlength: '63'}),
                                UIToolkit.submit(this.t('actionCommentUnreg'), true))));
        }

        // Add section elements, all separated by an <hr>
        const container = UIToolkit.div();
        sections.forEach((w, i) => container.append(i > 0 && Wrap.new('hr'), w));
        return container;
    }

    private dismissWith(choice: LoginChoice, idp?: string) {
        this._choice = choice;
        this._idp    = idp;
        this.dismiss(true);
    }
}
