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
        private readonly addingComment: boolean,
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
     * @param addingComment Whether the dialog is shown as a response to adding a new comment.
     */
    static run(parent: Wrap<any>, pos: DialogPositioning, baseUrl: string, config: InstanceConfig, pageInfo: PageInfo, addingComment: boolean): Promise<LoginDialog> {
        const dlg = new LoginDialog(parent, pos, baseUrl, config, pageInfo, addingComment);
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
                        Wrap.new('a')
                            .inner('Forgot your password?')
                            .attr({href: `${this.baseUrl}/en/auth/forgotPassword`, target: '_blank'})),
                // Switch to signup link, if signup is enabled
                this.config.dynamicConfig.get(InstanceDynamicConfigKey.domainDefaultsLocalSignupEnabled)?.value === 'true' &&
                    UIToolkit.div('dialog-centered')
                        .append(
                            Wrap.new('span').inner('Don\'t have an account? '),
                            Wrap.new('a').inner('Sign up here').click(() => this.dismissWith('signup'))));
            hasSections = true;
        }

        // Anonymous auth, only when adding a comment
        if (this.addingComment && this.pageInfo.authAnonymous) {
            form.append(
                // Separator
                hasSections && Wrap.new('hr'),
                // Subtitle
                UIToolkit.div('dialog-centered').inner('Not willing to login?'),
                // Comment anonymously button
                UIToolkit.div('oauth-buttons')
                    .append(UIToolkit.button('Comment anonymously', () => this.dismissWith('anonymous'), 'btn-secondary')));
        }
        return form;
    }

    private dismissWith(res: string) {
        this._result = res;
        this.dismiss(true);
    }
}
