import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { InstanceStaticConfig, FederatedIdentityProvider, PageInfo, Principal, SignupData, UserSettings } from './models';
import { LoginDialog } from './login-dialog';
import { SignupDialog } from './signup-dialog';
import { SettingsDialog } from './settings-dialog';

export class ProfileBar extends Wrap<HTMLDivElement> {

    private btnSettings?: Wrap<HTMLAnchorElement>;
    private btnLogin?: Wrap<HTMLButtonElement>;
    private principal?: Principal;
    private _pageInfo?: PageInfo;

    /**
     * @param baseUrl Base URL of the Comentario instance
     * @param root Root element (for showing popups).
     * @param config Comentario configuration obtained from the backend.
     * @param onGetAvatar Callback for obtaining an element for the user's avatar.
     * @param onLocalAuth Callback for executing a local authentication.
     * @param onOAuth Callback for executing external (OAuth) authentication.
     * @param onSignup Callback for executing user registration.
     * @param onSaveSettings Callback for saving user settings.
     */
    constructor(
        private readonly baseUrl: string,
        private readonly root: Wrap<any>,
        private readonly config: InstanceStaticConfig,
        private readonly onGetAvatar: () => Wrap<any> | undefined,
        private readonly onLocalAuth: (email: string, password: string) => Promise<void>,
        private readonly onOAuth: (idp: string) => Promise<void>,
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
        // Hide or show the login button based on the availability of any auth method
        this.btnLogin?.setClasses(!(v?.authLocal || v?.authSso || v?.idps?.length), 'hidden');
    }

    /**
     * Called whenever there's an authenticated user. Sets up the controls related to the current user.
     * @param principal Currently authenticated user.
     * @param onLogout Logout button click handler.
     */
    authenticated(principal: Principal, onLogout: () => void): void {
        this.btnLogin = undefined;
        this.principal = principal;

        // Recreate the content
        this.html('')
            .append(
                // Commenter avatar and name
                UIToolkit.div('logged-in-as')
                    .append(
                        // Avatar
                        this.onGetAvatar(),
                        // Name and link
                        Wrap.new(this.principal.websiteUrl ? 'a' : 'div')
                            .classes('name')
                            .inner(this.principal.name!)
                            .attr({
                                href: this.principal.websiteUrl,
                                rel:  this.principal.websiteUrl && 'nofollow noopener noreferrer',
                            })),
                // Buttons on the right
                UIToolkit.div()
                    .append(
                        // Settings link
                        this.btnSettings = Wrap.new('a')
                            .classes('profile-link')
                            .inner('Settings')
                            .click((_, e) => {
                                // Prevent the page from being reloaded because of the empty href
                                e.preventDefault();
                                return this.editSettings();
                            }),
                        // Logout link
                        Wrap.new('a')
                            .classes('profile-link')
                            .inner('Logout')
                            .attr({href: ''})
                            .click((_, e) => {
                                // Prevent the page from being reloaded because of the empty href
                                e.preventDefault();
                                onLogout();
                            })));
    }

    /**
     * Called whenever there's no authenticated user. Sets up the login controls.
     */
    notAuthenticated(): void {
        // Remove all content
        this.html('')
            .append(
                // Add an empty div to push the button to the right (profile bar uses 'justify-content: space-between')
                UIToolkit.div(),
                // Add a Login button
                this.btnLogin = UIToolkit.button('Login', () => this.loginUser(), 'fw-bold'));
    }

    /**
     * Show a login dialog and return a promise that's resolved when the dialog is closed.
     */
    async loginUser(): Promise<void> {
        // Make a list of available identity providers
        const idps: FederatedIdentityProvider[] = [];
        // -- Local
        if (this._pageInfo?.authLocal) {
            idps.push({id: '', name: 'Local'});
        }
        // -- SSO
        if (this._pageInfo?.authSso) {
            idps.push({id: 'sso', name: 'SSO'});
        }
        // -- Available federated IdPs enabled on the domain
        this.config.federatedIdps?.filter(idp => this._pageInfo?.idps?.includes(idp.id)).forEach(idp => idps.push(idp));

        // Make sure there's any IdP available
        if (!idps.length) {
            return Promise.reject('Cannot login: no configured authentication methods.');
        }

        // Display the login dialog
        const dlg = await LoginDialog.run(this.root, {ref: this.btnLogin!, placement: 'bottom-end'}, this.baseUrl, idps);
        if (dlg.confirmed) {
            switch (dlg.navigateTo) {
                case null:
                    // Local auth
                    return this.onLocalAuth(dlg.email, dlg.password);

                case 'signup':
                    // Switch to signup
                    return this.signupUser();

                default:
                    // External auth
                    return this.onOAuth(dlg.navigateTo);
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
            this.principal!,
            this._pageInfo!);
        if (dlg.confirmed) {
            await this.onSaveSettings(dlg.data);
        }
    }
}
