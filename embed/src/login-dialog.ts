import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { Dialog, DialogPositioning } from './dialog';
import { InstanceConfig, InstanceDynamicConfigKey, PageInfo } from './models';

export class LoginDialog extends Dialog {

    private _email?: Wrap<HTMLInputElement>;
    private _pwd?: Wrap<HTMLInputElement>;
    private _result: string | null = null;

    private constructor(
        parent: Wrap<any>,
        pos: DialogPositioning,
        private readonly baseUrl: string,
        private readonly config: InstanceConfig,
        private readonly pageInfo: PageInfo,
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
     * Dialog result: one of 'signup', 'anonymous', or the name of the chosen external IdP.
     */
    get result(): string | null {
        return this._result;
    }

    /**
     * Instantiate and show the dialog. Return a promise that resolves as soon as the dialog is closed.
     * @param parent Parent element for the dialog.
     * @param pos Positioning options.
     * @param baseUrl Base URL of the Comentario instance
     * @param config Comentario configuration obtained from the backend.
     * @param pageInfo Current page data.
     */
    static run(parent: Wrap<any>, pos: DialogPositioning, baseUrl: string, config: InstanceConfig, pageInfo: PageInfo): Promise<LoginDialog> {
        const dlg = new LoginDialog(parent, pos, baseUrl, config, pageInfo);
        return dlg.run(dlg);
    }

    override renderContent(): Wrap<any> {
        // Create a login form
        const form = UIToolkit.form(() => this.dismiss(true), () => this.dismiss());
        let hasSections = false;

        // SSO auth
        if (this.pageInfo.authSso) {
            form.append(
                // Subtitle
                UIToolkit.div('dialog-centered')
                    .inner(`Login via ${this.pageInfo.ssoUrl?.replace(/^.+:\/\/([^/]+).*$/, '$1')}`),
                // SSO button
                UIToolkit.div('oauth-buttons')
                    .append(UIToolkit.button('Single Sign-On', () => this.dismissWith('sso'), 'btn-sso')));
            hasSections = true;
        }

        // Add OAuth buttons, if applicable
        if (this.pageInfo.idps?.length) {
            form.append(
                // Separator
                hasSections && Wrap.new('hr'),
                // Subtitle
                UIToolkit.div('dialog-centered').inner('Proceed with social login'),
                // OAuth buttons
                UIToolkit.div('oauth-buttons')
                    .append(
                        ...this.pageInfo.idps.map(idp =>
                            UIToolkit.button(idp.name, () => this.dismissWith(idp.id), `btn-${idp.id}`))));
            hasSections = true;
        }

        // Local auth
        if (this.pageInfo.authLocal) {
            // Create inputs
            this._email = UIToolkit.input('email',    'email',    'Email address', 'email',            true).attr({maxlength: '254'});
            this._pwd   = UIToolkit.input('password', 'password', 'Password',      'current-password', true).attr({maxlength: '63'});

            // Add the inputs to the dialog
            form.append(
                // Separator
                hasSections && Wrap.new('hr'),
                // Subtitle
                UIToolkit.div('dialog-centered').inner('Log in with your email address'),
                // Email
                UIToolkit.div('input-group').append(this._email),
                // Password
                UIToolkit.div('input-group').append(this._pwd, UIToolkit.submit('Log in', true)),
                // Forgot password link
                UIToolkit.div('dialog-centered')
                    .append(
                        UIToolkit.a('Forgot your password?', `${this.baseUrl}/en/auth/forgotPassword`)
                            .append(UIToolkit.icon('newTab').classes('ms-1'))));
            hasSections = true;
        }

        // Signup and anonymous auth
        const canSignup = this.config.dynamicConfig.get(InstanceDynamicConfigKey.domainDefaultsLocalSignupEnabled)?.value === 'true';
        if (canSignup || this.pageInfo.authAnonymous) {
            form.append(
                // Separator
                hasSections && Wrap.new('hr'),
                UIToolkit.div('flex', 'flex-wrap').append(
                    // Signup
                    canSignup && UIToolkit.div('flex-50', 'text-center')
                        .append(
                            UIToolkit.div('dialog-centered').inner('Don\'t have an account? '),
                            UIToolkit.button('Sign up here', () => this.dismissWith('signup'), 'btn-secondary')),
                    // Anonymous auth
                    this.pageInfo.authAnonymous && UIToolkit.div('flex-50', 'text-center')
                        .append(
                            UIToolkit.div('dialog-centered').inner('Not willing to login?'),
                            UIToolkit.button('Comment anonymously', () => this.dismissWith('anonymous'), 'btn-secondary'))));
        }
        return form;
    }

    private dismissWith(res: string) {
        this._result = res;
        this.dismiss(true);
    }
}
