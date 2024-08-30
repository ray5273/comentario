import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import {
    AsyncProc, AsyncProcWithArg,
    LoginChoice,
    LoginData,
    PageInfo,
    Principal,
    SignupData,
    TranslateFunc,
    UserSettings,
} from './models';
import { LoginDialog } from './login-dialog';
import { SignupDialog } from './signup-dialog';
import { SettingsDialog } from './settings-dialog';

export class ProfileBar extends Wrap<HTMLDivElement> {

    private _btnSettings?: Wrap<HTMLButtonElement>;
    private _btnLogin?: Wrap<HTMLButtonElement>;
    private _principal?: Principal;
    private _pageInfo?: PageInfo;

    /**
     * @param t Function for obtaining translated messages.
     * @param baseUrl Base URL of the Comentario instance
     * @param root Root element (for showing popups).
     * @param onGetAvatar Callback for obtaining an element for the user's avatar.
     * @param onLogin Callback invoked when user made a choice in the Login dialog (opened from the profile bar)
     * @param onLogout Callback for executing logout.
     * @param onSignup Callback for executing user registration.
     * @param onSaveSettings Callback for saving user settings.
     * @param onToggleLock Callback for toggling page lock.
     * @param onOpenProfile Callback for Edit Comentario profile click
     */
    constructor(
        private readonly t: TranslateFunc,
        private readonly baseUrl: string,
        private readonly root: Wrap<any>,
        private readonly onGetAvatar: () => Wrap<any> | undefined,
        private readonly onLogin: AsyncProcWithArg<LoginData>,
        private readonly onLogout: AsyncProc,
        private readonly onSignup: AsyncProcWithArg<SignupData>,
        private readonly onSaveSettings: AsyncProcWithArg<UserSettings>,
        private readonly onToggleLock: AsyncProc,
        private readonly onOpenProfile: AsyncProc,
    ) {
        super(UIToolkit.div('profile-bar', 'toolbar', 'py-2').element);
    }

    /**
     * The Login button element, for positioning dialogs.
     */
    get btnLogin(): Wrap<any> | undefined {
        return this._btnLogin;
    }

    /**
     * The Settings button element, for positioning dialogs.
     */
    get btnSettings(): Wrap<any> | undefined {
        return this._btnSettings;
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
        if (!this._pageInfo?.hasAuthMethod(true)) {
            return Promise.reject();
        }

        // If there's only one external auth method available, use it right away
        if (!this._pageInfo.authLocal && !this._pageInfo.authAnonymous) {
            switch (this._pageInfo.idps?.length || 0) {
                // If only SSO is enabled: trigger an SSO login
                case 0:
                    if (this._pageInfo.authSso) {
                        return this.login({choice: LoginChoice.federatedAuth, idp: 'sso'});
                    }
                    break;

                // A single federated IdP is enabled: turn to that IdP
                case 1:
                    return this.login({choice: LoginChoice.federatedAuth, idp: this._pageInfo.idps![0].id});
            }
        }

        // Multiple options are available, show the login dialog
        const dlg = await LoginDialog.run(
            this.t,
            this.root,
            {ref: this._btnLogin!, placement: 'bottom-end'},
            this.baseUrl,
            this._pageInfo);

        // IF the dialog is confirmed, either switch to signup or execute a login, depending on the user's choice
        if (dlg.confirmed) {
            const data = dlg.data;
            return data.choice === LoginChoice.signup ? this.signupUser() : this.login(data);
        }
    }

    /**
     * Show a signup dialog and return a promise that's resolved when the dialog is closed and the submission is
     * complete.
     */
    private async signupUser(): Promise<void> {
        const dlg = await SignupDialog.run(this.t, this.root, {ref: this._btnLogin!, placement: 'bottom-end'}, this._pageInfo!);
        if (dlg.confirmed) {
            return this._btnLogin!.spin(() => this.onSignup(dlg.data));
        }
    }

    /**
     * Invoke the login callback while showing a spinner on the Login button.
     */
    private async login(data: LoginData): Promise<void> {
        return this._btnLogin!.spin(() => this.onLogin(data));
    }

    /**
     * Show the settings dialog and return a promise that's resolved when the dialog is closed.
     */
    private async editSettings(): Promise<void> {
        await SettingsDialog.run(
            this.t,
            this.root,
            {ref: this._btnSettings!, placement: 'bottom-end'},
            this._principal!,
            us => this.onSaveSettings(us),
            this.onOpenProfile);
    }

    /**
     * (Re)render the profile bar.
     */
    private render() {
        // Remove all content
        this.html('');
        this._btnSettings = undefined;
        this._btnLogin    = undefined;

        // If the user is authenticated
        if (this._principal) {
            const isMod = this._principal.isSuperuser || this._principal.isOwner || this._principal.isModerator;
            const isDomainRO = this._pageInfo?.isDomainReadonly;
            const isPageRO   = this._pageInfo?.isPageReadonly;
            this.append(
                // Commenter avatar and name
                UIToolkit.div('toolbar-section')
                    .append(
                        // Avatar
                        this.onGetAvatar(),
                        // Name and link
                        Wrap.new(this._principal.websiteUrl ? 'a' : 'div')
                            .classes('name', 'text-muted', 'fw-bold')
                            .inner(this._principal.name!)
                            .attr({
                                href: this._principal.websiteUrl,
                                rel:  this._principal.websiteUrl && 'nofollow noopener noreferrer',
                            })),
                // Buttons on the right
                UIToolkit.div('toolbar-section')
                    .append(
                        // Lock/Unlock button. The whole comment thread will be reloaded if it's toggled
                        isMod && !isDomainRO &&
                            UIToolkit.toolButton(
                                isPageRO ? 'unlock' : 'lock',
                                this.t(isPageRO ? 'btnUnlock' : 'btnLock'),
                                btn => btn.spin(this.onToggleLock),
                                'btn-lg'),
                        // Settings button
                        this._btnSettings = UIToolkit.toolButton('gear', this.t('btnSettings'), () => this.editSettings(), 'btn-lg'),
                        // Logout button
                        UIToolkit.toolButton('exit', this.t('btnLogout'), btn => btn.spin(this.onLogout), 'btn-lg')));
            return;
        }

        // User is unauthenticated. Add a Sign in button, but only if there's an interactive auth method available
        if (this._pageInfo?.hasAuthMethod(true)) {
            this.append(
                // Add an empty div to push the button to the right (profile bar uses 'justify-content: space-between')
                UIToolkit.div(),
                // Add a Login button
                this._btnLogin = UIToolkit.button(this.t('actionSignIn'), () => this.loginUser(), 'btn-primary', 'fw-bold'));
        }
    }
}
