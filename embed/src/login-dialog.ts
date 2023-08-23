import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { Dialog, DialogPositioning } from './dialog';
import { FederatedIdentityProvider } from './models';

export class LoginDialog extends Dialog {

    private _email?: Wrap<HTMLInputElement>;
    private _pwd?: Wrap<HTMLInputElement>;
    private _navigateTo: string | null = null;

    private constructor(
        parent: Wrap<any>,
        pos: DialogPositioning,
        private readonly baseUrl: string,
        private readonly idps: FederatedIdentityProvider[],
    ) {
        super(parent, 'Log in', pos);
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
     * Where to navigate ('signup') or the name of an external IdP is chosen.
     */
    get navigateTo(): string | null {
        return this._navigateTo;
    }

    /**
     * Instantiate and show the dialog. Return a promise that resolves as soon as the dialog is closed.
     * @param parent Parent element for the dialog.
     * @param pos Positioning options.
     * @param baseUrl Base URL of the Comentario instance
     * @param idps List of enabled identity providers.
     */
    static run(parent: Wrap<any>, pos: DialogPositioning, baseUrl: string, idps: FederatedIdentityProvider[]): Promise<LoginDialog> {
        const dlg = new LoginDialog(parent, pos, baseUrl, idps);
        return dlg.run(dlg);
    }

    override renderContent(): Wrap<any> {
        // Create a login form
        const form = UIToolkit.form(() => this.dismiss(true), () => this.dismiss());
        const federatedIdps = this.idps.filter(idp => idp.id !== '' && idp.id !== 'sso');
        const hasLocalAuth = this.idps.some(idp => idp.id === '');

        // SSO auth
        if (this.idps.some(idp => idp.id === 'sso')) {
            form.append(
                // SSO button
                UIToolkit.div('oauth-buttons')
                    .append(UIToolkit.button('Single Sign-On', () => this.dismissWith('sso'), 'oauth-button', 'sso-button')),
                // Subtitle
                UIToolkit.div('dialog-centered').inner(`Proceed with ${parent.location.host} authentication`),
                // Separator
                (federatedIdps.length > 0 || hasLocalAuth) && Wrap.new('hr'));
        }

        // Add OAuth buttons, if applicable
        if (federatedIdps.length) {
            form.append(
                // Subtitle
                UIToolkit.div('dialog-centered').inner('Proceed with social login'),
                // OAuth buttons
                UIToolkit.div('oauth-buttons')
                    .append(
                        ...federatedIdps.map(idp =>
                            UIToolkit.button(idp.name, () => this.dismissWith(idp.id), 'oauth-button', `${idp.id}-button`))),
                // Separator
                hasLocalAuth && Wrap.new('hr'));
        }

        // Local auth
        if (hasLocalAuth) {
            // Create inputs
            this._email = UIToolkit.input('email',    'email',    'Email address', 'email',            true);
            this._pwd   = UIToolkit.input('password', 'password', 'Password',      'current-password', true);

            // Add the inputs to the dialog
            form.append(
                // Subtitle
                UIToolkit.div('dialog-centered').inner('Log in with your email address'),
                // Email
                UIToolkit.div('input-group').append(this._email),
                // Password
                UIToolkit.div('input-group').append(this._pwd, UIToolkit.submit('Log in', true)),
                // Forgot password link
                UIToolkit.div('dialog-centered')
                    .append(
                        Wrap.new('a')
                            .inner('Forgot your password?')
                            .attr({href: `${this.baseUrl}/en/auth/forgotPassword`, target: '_blank'})),
                // Switch to signup link container
                UIToolkit.div('dialog-centered')
                    .append(
                        Wrap.new('span').inner('Don\'t have an account? '),
                        Wrap.new('a').inner('Sign up here').click(() => this.dismissWith('signup'))));
        }
        return form;
    }

    override onShow(): void {
        this._email?.focus();
    }

    private dismissWith(nav: string) {
        this._navigateTo = nav;
        this.dismiss(true);
    }
}
