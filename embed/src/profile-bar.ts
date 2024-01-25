import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { PageInfo, Principal, SignupData, UserSettings } from './models';
import { LoginDialog } from './login-dialog';
import { SignupDialog } from './signup-dialog';
import { SettingsDialog } from './settings-dialog';
import { InstanceConfig } from './config';

export class ProfileBar extends Wrap<HTMLDivElement> {

    private btnSettings?: Wrap<HTMLButtonElement>;
    private btnLogin?: Wrap<HTMLButtonElement>;
    private _principal?: Principal;
    private _pageInfo?: PageInfo;

    /**
     * @param baseUrl Base URL of the Comentario instance
     * @param root Root element (for showing popups).
     * @param config Comentario configuration obtained from the backend.
     * @param onGetAvatar Callback for obtaining an element for the user's avatar.
     * @param onAnonymousAuth Callback invoked when user chose to comment anonymously.
     * @param onLocalAuth Callback for executing a local authentication.
     * @param onOAuth Callback for executing external (OAuth) authentication.
     * @param onLogout Callback for executing logout.
     * @param onSignup Callback for executing user registration.
     * @param onSaveSettings Callback for saving user settings.
     */
    constructor(
        private readonly baseUrl: string,
        private readonly root: Wrap<any>,
        private readonly config: InstanceConfig,
        private readonly onGetAvatar: () => Wrap<any> | undefined,
        private readonly onAnonymousAuth: () => void,
        private readonly onLocalAuth: (email: string, password: string) => Promise<void>,
        private readonly onOAuth: (idp: string) => Promise<void>,
        private readonly onLogout: () => void,
        private readonly onSignup: (data: SignupData) => Promise<void>,
        private readonly onSaveSettings: (data: UserSettings) => Promise<void>,
    ) {
        super(UIToolkit.div('profile-bar').element);
    }

    /**
     * Current page data.
     */
    set pageInfo(v: PageInfo | undefined) {
        this._pageInfo = v;
        this.render();
    }

    /**
     * Currently authenticated principal, if any.
     */
    set principal(v: Principal | undefined) {
        this._principal = v;
        this.render();
    }

    /**
     * Show a login dialog and return a promise that's resolved when the dialog is closed.
     */
    async loginUser(): Promise<void> {
        // If there's only one external auth method available, use it right away
        if (!this._pageInfo?.authLocal && !this._pageInfo?.authAnonymous) {
            switch (this._pageInfo?.idps?.length || 0) {
                // If only SSO is enabled: trigger an SSO login
                case 0:
                    if (this._pageInfo?.authSso) {
                        return this.onOAuth('sso');
                    }
                    break;

                // A single federated IdP is enabled: turn to that IdP
                case 1:
                    return this.onOAuth(this._pageInfo!.idps![0].id);
            }
        }

        // Multiple options are available, show the login dialog
        const dlg = await LoginDialog.run(
            this.root,
            {ref: this.btnLogin!, placement: 'bottom-end'},
            this.baseUrl,
            this.config,
            this._pageInfo!);
        if (dlg.confirmed) {
            switch (dlg.result) {
                case null:
                    // Local auth
                    return this.onLocalAuth(dlg.email, dlg.password);

                case 'anonymous':
                    // User chose "Comment anonymously"
                    this.onAnonymousAuth();
                    return;

                case 'signup':
                    // Switch to signup
                    return this.signupUser();

                default:
                    // External auth
                    return this.onOAuth(dlg.result);
            }
        }
    }

    /**
     * Show a signup dialog and return a promise that's resolved when the dialog is closed.
     */
    async signupUser(): Promise<void> {
        const dlg = await SignupDialog.run(this.root, {ref: this.btnLogin!, placement: 'bottom-end'}, this.config);
        if (dlg.confirmed) {
            await this.onSignup(dlg.data);
        }
    }

    /**
     * Show the settings dialog and return a promise that's resolved when the dialog is closed.
     */
    async editSettings(): Promise<void> {
        const dlg = await SettingsDialog.run(
            this.root,
            {ref: this.btnSettings!, placement: 'bottom-end'},
            this.baseUrl,
            this._principal!,
            this._pageInfo!);
        if (dlg.confirmed) {
            await this.onSaveSettings(dlg.data);
        }
    }

    /**
     * (Re)render the profile bar.
     */
    private render() {
        // Remove all content
        this.html('');
        this.btnSettings = undefined;
        this.btnLogin = undefined;

        // If the user is authenticated
        if (this._principal) {
            this.append(
                // Commenter avatar and name
                UIToolkit.div('logged-in-as')
                    .append(
                        // Avatar
                        this.onGetAvatar(),
                        // Name and link
                        Wrap.new(this._principal.websiteUrl ? 'a' : 'div')
                            .classes('name')
                            .inner(this._principal.name!)
                            .attr({
                                href: this._principal.websiteUrl,
                                rel:  this._principal.websiteUrl && 'nofollow noopener noreferrer',
                            })),
                // Buttons on the right
                UIToolkit.div()
                    .append(
                        // Settings link
                        this.btnSettings = UIToolkit.button('Settings', () => this.editSettings(), 'btn-link'),
                        // Logout link
                        UIToolkit.button('Logout', () => this.onLogout(), 'btn-link')));
            return;
        }

        // User is anonymous. Add a login button, but only if there's an auth method available
        if (this._pageInfo?.authLocal || (this._pageInfo?.authSso && !this._pageInfo.ssoNonInteractive) || this._pageInfo?.idps?.length) {
            this.append(
                // Add an empty div to push the button to the right (profile bar uses 'justify-content: space-between')
                UIToolkit.div(),
                // Add a Login button
                this.btnLogin = UIToolkit.button('Login', () => this.loginUser(), 'btn-link', 'fw-bold'));
        }
    }
}
