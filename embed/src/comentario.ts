import {
    ANONYMOUS_ID,
    Comment,
    CommenterMap,
    CommentsGroupedById,
    CommentSort,
    ErrorMessage,
    IdentityProvider,
    Message,
    OkMessage,
    PageInfo,
    Principal,
    SignupData,
    StringBooleanMap,
    User,
    UserSettings,
    UUID,
} from './models';
import { ApiCommentListResponse, ApiService } from './api';
import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { CommentCard, CommentRenderingContext, CommentTree } from './comment-card';
import { CommentEditor } from './comment-editor';
import { ProfileBar } from './profile-bar';
import { SortBar } from './sort-bar';
import { Utils } from './utils';

export class Comentario {

    /** Origin URL, which gets replaced by the backend on serving the file. */
    private readonly origin = '[[[.Origin]]]';
    /** CDN URL, which gets replaced by the backend on serving the file. */
    private readonly cdn = '[[[.CdnPrefix]]]';
    /** App version, which gets replaced by the backend on serving the file. */
    private readonly version = '[[[.Version]]]';

    /** Service handling API requests. */
    private readonly apiService = new ApiService(
        `${this.origin}/api`,
        this.doc,
        () => this.setMessage(),
        err => this.setMessage(ErrorMessage.of(err)));

    /** Default ID of the container element Comentario will be embedded into. */
    private rootId = 'comentario';

    /** The root element of Comentario embed. */
    private root?: Wrap<any>;

    /** Message panel (only shown when needed). */
    private messagePanel?: Wrap<HTMLDivElement>;

    /** User profile toolbar. */
    private profileBar?: ProfileBar;

    /** Moderator tools panel. */
    private modTools?: Wrap<HTMLDivElement>;
    private modToolsLockBtn?: Wrap<HTMLButtonElement>;

    /** Main area panel. */
    private mainArea?: Wrap<HTMLDivElement>;

    /** Container for hosting the Add comment editor. */
    private addCommentHost?: Wrap<HTMLDivElement>;

    /** Currently active comment editor instance. */
    private editor?: CommentEditor;

    /** Comments panel inside the mainArea. */
    private commentsArea?: Wrap<HTMLDivElement>;

    /** Map of commenters by their ID. */
    private readonly commenters: CommenterMap = {};

    /** Map of loaded CSS stylesheet URLs. */
    private readonly loadedCss: StringBooleanMap = {};

    /** Map of comments, grouped by their ID. */
    private parentIdMap?: CommentsGroupedById;

    /** Federated identity providers configured on the backend. */
    private federatedIdps: IdentityProvider[] = [];

    /** Path of the page for loading comments. Defaults to the actual path on the host. */
    private pagePath = parent.location.pathname;

    /** Current host. */
    private host = parent.location.host;

    /** Currently authenticated principal or undefined if the user isn't authenticated. */
    private principal?: Principal;

    /** Current page info as retrieved from the server. */
    private pageInfo?: PageInfo;

    /** Currently applied comment sort. */
    private commentSort: CommentSort = 'sd';

    /**
     * Optional CSS stylesheet URL that gets loaded after the default one. Setting to 'false' disables loading any CSS
     * altogether.
     */
    private cssOverride?: string;
    private noFonts = false;
    private hideDeleted = false;
    private autoInit = true;
    private initialised = false;

    constructor(
        private readonly doc: Document,
    ) {
        this.whenDocReady().then(() => this.init());
    }

    /**
     * The main worker routine of Comentario
     * @return Promise that resolves as soon as Comentario setup is complete
     */
    async main(): Promise<void> {
        // Make sure there's a root element present, and save it
        this.root = Wrap.byId(this.rootId, true);
        if (!this.root.ok) {
            return this.reject(`No root element with id='${this.rootId}' found. Check your configuration and HTML.`);
        }

        // If CSS isn't disabled altogether
        if (this.cssOverride !== 'false') {
            try {
                // Begin by loading the stylesheet
                await this.cssLoad(`${this.cdn}/comentario.css`);

                // Load stylesheet override, if any
                if (this.cssOverride) {
                    await this.cssLoad(this.cssOverride);
                }
            } catch (e) {
                // Do not block Comentario load on CSS load failure, but log the error to the console
                console.error(e);
            }
        }

        // Load client configuration
        await this.loadClientConfig();

        // Set up the root content
        this.root
            .classes('root', !this.noFonts && 'root-font')
            .append(
                // Profile bar
                this.profileBar = new ProfileBar(
                    this.origin,
                    this.root,
                    this.federatedIdps,
                    () => this.createAvatarElement(this.principal),
                    (email, password) => this.authenticateLocally(email, password),
                    idp => this.openOAuthPopup(idp),
                    data => this.signup(data),
                    data => this.saveUserSettings(data)),
                // Main area
                this.mainArea = UIToolkit.div('main-area'),
                // Footer
                UIToolkit.div('footer')
                    .append(
                        UIToolkit.div('logo-container')
                            .append(
                                Wrap.new('a')
                                    .attr({href: 'https://comentario.app/', target: '_blank'})
                                    .html('Powered by ')
                                    .append(Wrap.new('span').classes('logo-brand').inner('Comentario')))));

        // Load information about ourselves
        await this.updateAuthStatus();

        // Load the UI
        await this.reload();

        // Scroll to the requested comment, if any
        this.scrollToCommentHash();
    }

    /**
     * Return a rejected promise with the given message.
     * @param message Message to reject the promise with.
     */
    private reject(message: string): Promise<never> {
        return Promise.reject(`Comentario: ${message}`);
    }

    /**
     * Returns a promise that gets resolved as soon as the document reaches at least its 'interactive' state.
     */
    private whenDocReady(): Promise<void> {
        return new Promise(resolved => {
            const checkState = () => {
                switch (this.doc.readyState) {
                    // The document is still loading. The div we need to fill might not have been parsed yet, so let's
                    // wait and retry when the readyState changes
                    case 'loading':
                        this.doc.addEventListener('readystatechange', () => checkState());
                        break;

                    case 'interactive': // The document has been parsed and DOM objects are now accessible.
                    case 'complete': // The page has fully loaded (including JS, CSS, and images)
                        resolved();
                }
            };
            checkState();
        });
    }

    /**
     * Initialise the Comentario engine on the current page.
     */
    private async init(): Promise<void> {
        // Only perform initialisation once
        if (this.initialised) {
            return this.reject('Already initialised, ignoring the repeated init call');
        }
        this.initialised = true;

        // Parse any custom data-* tags on the Comentario script element
        this.dataTagsLoad();

        // If automatic initialisation is activated (default), run Comentario
        if (this.autoInit) {
            await this.main();
        }
        console.info(`Initialised Comentario ${this.version}`);
    }

    /**
     * Load the stylesheet with the provided URL into the DOM
     * @param url Stylesheet URL.
     */
    cssLoad(url: string): Promise<void> {
        // Don't bother if the stylesheet has been loaded already
        return this.loadedCss[url] ?
            Promise.resolve() :
            new Promise((resolve, reject) => {
                this.loadedCss[url] = true;
                new Wrap(this.doc.getElementsByTagName('head')[0])
                    .append(
                        Wrap.new('link')
                            .attr({href: url, rel: 'stylesheet', type: 'text/css'})
                            .on('load', () => resolve())
                            .on('error', (_, e) => reject(e)));
            });
    }

    /**
     * Reload the app UI.
     */
    private async reload() {
        // Fetch page data and comments
        await this.loadPageData();

        // Update the main area
        this.setupMainArea();

        // Render the comments
        this.renderComments();
    }

    /**
     * Read page settings from the data-* tags on the comentario script node.
     */
    private dataTagsLoad() {
        for (const script of this.doc.getElementsByTagName('script')) {
            if (script.src.match(/\/comentario\.js$/)) {
                const ws = new Wrap(script);
                let s = ws.getAttr('data-page-id');
                if (s) {
                    this.pagePath = s;
                }
                this.cssOverride = ws.getAttr('data-css-override');
                this.autoInit = ws.getAttr('data-auto-init') !== 'false';
                s = ws.getAttr('data-id-root');
                if (s) {
                    this.rootId = s;
                }
                this.noFonts = ws.getAttr('data-no-fonts') === 'true';
                this.hideDeleted = ws.getAttr('data-hide-deleted') === 'true';
                break;
            }
        }
    }

    /**
     * Scroll to the comment whose ID is provided in the current window's fragment (if any).
     */
    private scrollToCommentHash() {
        const h = window.location.hash;

        // If the hash starts with a valid ID
        if (h?.startsWith('#comentario-')) {
            this.scrollToComment(h.substring(12));

        } else if (h?.startsWith('#comentario')) {
            // If we're requested to scroll to the comments in general
            this.root!.scrollTo();
        }
    }

    /**
     * Scroll to the comment with the specified ID.
     * @param id Comment ID to scroll to.
     */
    private scrollToComment(id: UUID) {
        Wrap.byId(`card-${id}`)
            .classes('bg-highlight')
            .scrollTo()
            .else(() => {
                // Make sure it's a valid ID before showing the user a message
                if (Utils.isUuid(id)) {
                    this.setMessage(new ErrorMessage('The comment you\'re looking for doesn\'t exist; possibly it was deleted.'));
                }
            });
    }

    /**
     * (Re)render all comments recursively, adding them to the comments area.
     */
    private renderComments() {
        this.commentsArea!
            .html('')
            .append(...new CommentTree().render(this.makeCommentRenderingContext()));
    }

    /**
     * Set and display (message is given) or clean (message is falsy) a message in the message panel.
     * @param message Message object to set. If undefined, the error panel gets removed.
     */
    private setMessage(message?: Message) {
        // Remove any existing message
        this.messagePanel?.remove();
        this.messagePanel = undefined;

        // No message means remove any message
        if (!message) {
            return;
        }

        // Determine message severity
        const err = message.severity === 'error';

        // Create a message panel
        this.root!.prepend(
            this.messagePanel = UIToolkit.div('message-box')
                .classes(err && 'error')
                // Message text
                .append(UIToolkit.div('text-center').inner(err ? `Error: ${message.text}.` : message.text)));

        // If there are details
        if (message.details) {
            const details = Wrap.new('pre').classes('hidden').inner(message.details);
            let hidden = true;
            this.messagePanel.append(
                // Details toggle link
                Wrap.new('div').append(
                    Wrap.new('a').classes('small').inner('Details ▾').click(() => details.setClasses(hidden = !hidden, 'hidden'))),
                // Details text
                details);
        }

        // Scroll to the message
        this.messagePanel.scrollTo();
    }

    /**
     * Fetch client configuration from the backend.
     */
    private async loadClientConfig(): Promise<void> {
        this.federatedIdps = [];
        const r = await this.apiService.configClientGet();
        this.federatedIdps = r.federatedIdps;
    }

    /**
     * Request the authentication status of the current user from the backend, and return a promise that resolves as
     * soon as the status becomes definite.
     */
    private async updateAuthStatus(): Promise<void> {
        this.principal = await this.apiService.authPrincipal();

        // User is authenticated
        if (this.principal) {
            // Update the profile bar
            this.profileBar!.authenticated(this.principal, () => this.logout());

        } else {
            // User isn't authenticated: clean up the profile bar (known auth methods will be set up later)
            this.profileBar!.notAuthenticated();
        }
    }

    /**
     * Create and return a main area element.
     */
    private setupMainArea() {
        // Clean up everything from the main area
        this.mainArea!.html('');
        this.modTools = undefined;
        this.modToolsLockBtn = undefined;
        this.commentsArea = undefined;

        // Add a moderator toolbar, in necessary
        if (this.principal?.isModerator) {
            this.mainArea!.append(
                this.modTools = UIToolkit.div('mod-tools')
                    .append(
                        // Title
                        Wrap.new('span').classes('mod-tools-title').inner('Moderator tools'),
                        // Lock/Unlock button
                        this.modToolsLockBtn = UIToolkit.button(
                            this.pageInfo?.isPageReadonly ? 'Unlock thread' : 'Lock thread',
                            () => this.pageReadonlyToggle())));
        }

        // If the domain or the page are readonly, add a corresponding message
        if (this.pageInfo?.isDomainReadonly || this.pageInfo?.isPageReadonly) {
            this.mainArea!.append(UIToolkit.div('moderation-notice').inner('This thread is locked. You cannot add new comments.'));

        // Otherwise, add a comment editor host, which will get an editor for creating a new comment
        } else {
            this.mainArea!.append(
                this.addCommentHost = UIToolkit.div('add-comment-host')
                    .attr({tabindex: '0'})
                    // Activate the editor on focus, but only if it isn't active yet
                    .on('focus', t => !t.hasClass('editor-inserted') && this.addComment(undefined)));
        }

        // If there's any comment, add sort buttons
        if (this.parentIdMap) {
            this.mainArea!.append(new SortBar(
                cs => {
                    this.commentSort = cs;
                    // Re-render comments using the new sort
                    this.renderComments();
                },
                this.commentSort));
        }

        // Create a panel for comments
        this.commentsArea = UIToolkit.div('comments').appendTo(this.mainArea!);
    }

    /**
     * Start editing new comment.
     * @param parentCard Parent card for adding a reply to. If falsy, a top-level comment is being added
     */
    private addComment(parentCard?: CommentCard) {
        // Kill any existing editor
        this.cancelCommentEdits();

        // Create a new editor
        this.editor = new CommentEditor(
            parentCard?.children || this.addCommentHost!,
            this.root!,
            false,
            '',
            !!this.principal,
            this.pageInfo!,
            () => this.cancelCommentEdits(),
            async editor => await this.submitNewComment(parentCard, editor.markdown, editor.anonymous));
    }

    /**
     * Start editing existing comment.
     * @param card Card hosting the comment.
     */
    private editComment(card: CommentCard) {
        // Kill any existing editor
        this.cancelCommentEdits();

        // Create a new editor
        this.editor = new CommentEditor(
            card,
            this.root!,
            true,
            card.comment.markdown!,
            true,
            this.pageInfo!,
            () => this.cancelCommentEdits(),
            async editor => await this.submitCommentEdits(card, editor.markdown));
    }

    /**
     * Submit a new comment to the backend, authenticating the user before if necessary.
     * @param parentCard Parent card for adding a reply to. If falsy, a top-level comment is being added
     * @param markdown Markdown text entered by the user.
     * @param anonymous Whether the user chose to comment anonymously.
     */
    private async submitNewComment(parentCard: CommentCard | undefined, markdown: string, anonymous: boolean): Promise<void> {
        // Authenticate the user, if required
        const auth = !this.pageInfo?.authAnonymous || !anonymous;
        if (!this.principal && auth) {
            await this.profileBar!.loginUser();
        }

        // If we can proceed: user logged in or that wasn't required
        if (this.principal || !auth) {
            // Submit the comment to the backend
            const r = await this.apiService.commentNew(this.host, this.pagePath, parentCard?.comment.id, markdown);

            // Make sure parent map exists
            if (!this.parentIdMap) {
                this.parentIdMap = {};
            }

            // Add the comment to the parent map
            const parentId = parentCard?.comment.id ?? '';
            if (parentId in this.parentIdMap) {
                this.parentIdMap[parentId].push(r.comment);
            } else {
                this.parentIdMap[parentId] = [r.comment];
            }

            // Remove the editor
            this.cancelCommentEdits();

            // Re-render comments
            this.renderComments();

            // Scroll to the added comment
            this.scrollToComment(r.comment.id);
        }
    }

    /**
     * Submit the entered comment markdown to the backend for saving.
     * @param card Card whose comment is being updated.
     * @param markdown Markdown text entered by the user.
     */
    private async submitCommentEdits(card: CommentCard, markdown: string): Promise<void> {
        // Submit the edits to the backend
        const r = await this.apiService.commentUpdate(card.comment.id, markdown);

        // Update the comment in the card, replacing the original in the parentIdMap and preserving the vote direction
        // (it isn't provided in the returned comment)
        card.comment = this.replaceCommentById(r.comment, {direction: card.comment.direction});

        // Remove the editor
        this.cancelCommentEdits();
    }

    /**
     * Stop editing comment and remove any existing editor.
     */
    private cancelCommentEdits() {
        this.editor?.remove();
    }

    /**
     * Register the user with the given details and log them in.
     * @param data User's signup data.
     */
    private async signup(data: SignupData): Promise<void> {
        // Sign the user up
        const isConfirmed = await this.apiService.authSignup(data.email, data.name, data.password, data.websiteUrl, parent.location.href);

        // If the user is confirmed, log them immediately in
        if (isConfirmed) {
            await this.authenticateLocally(data.email, data.password);

        } else {
            // Otherwise, show a message that the user should confirm their email
            this.setMessage(new OkMessage('Account is successfully created. Please check your email and click the confirmation link it contains.'));
        }
    }

    /**
     * Authenticate the user using local authentication (email and password).
     * @param email User's email.
     * @param password User's password.
     */
    private async authenticateLocally(email: string, password: string): Promise<void> {
        // Log the user in
        await this.apiService.authLogin(email, password, this.host);

        // Refresh the auth status
        await this.updateAuthStatus();

        // If authenticated, reload all comments and page data
        if (this.principal) {
            await this.reload();
        }
    }

    /**
     * Open a new browser popup window for authenticating with the given identity provider and return a promise that
     * resolves as soon as the user is authenticated, or rejects when the authentication has been unsuccessful.
     * @param idp Identity provider to initiate authentication with.
     */
    private async openOAuthPopup(idp: string): Promise<void> {
        // Request a new, anonymous login token
        const token = await this.apiService.authNewLoginToken();

        // Open a popup window
        const popup = window.open(`${this.apiService.basePath}/oauth/${idp}?host=${encodeURIComponent(this.host)}&token=${token}`, '_blank', 'popup,width=800,height=600');
        if (!popup) {
            return this.reject('Failed to open OAuth popup');
        }

        // Wait until the popup is closed
        await new Promise<void>(resolve => {
            const interval = setInterval(
                () => {
                    if (popup.closed) {
                        clearInterval(interval);
                        resolve();
                    }
                },
                500);
        });

        // If the authentication was successful, the token is supposed to be bound to the user now. Use it for login
        await this.apiService.authLoginToken(token, this.host);

        // Refresh the auth status
        await this.updateAuthStatus();

        // If authenticated, reload all comments and page data
        if (this.principal) {
            await this.reload();
        }
    }

    /**
     * Log the current user out.
     */
    private async logout(): Promise<void> {
        // Terminate the server session
        await this.apiService.authLogout();
        // Update auth status controls
        await this.updateAuthStatus();
        // Reload the comments and other stuff
        return this.reload();
    }

    /**
     * Load data for the current page URL, including the comments, from the backend and store them locally
     */
    private async loadPageData(): Promise<void> {
        // Retrieve page settings and a comment list from the backend
        let r: ApiCommentListResponse;
        try {
            r = await this.apiService.commentList(this.host, this.pagePath);

            // Store page- and backend-related properties
            this.pageInfo = r.pageInfo;
            this.commentSort = r.pageInfo.defaultSort;

            // Configure the page in the profile bar
            this.profileBar!.pageInfo = r.pageInfo;

        } catch (err) {
            // Remove the page from the profile bar on error: this will disable login
            this.profileBar!.pageInfo = undefined;
            throw err;
        }

        // Build a map by grouping all comments by their parentId value
        this.parentIdMap = r.comments?.reduce(
            (m, c) => {
                const pid = c.parentId ?? '';
                if (pid in m) {
                    m[pid].push(c);
                } else {
                    m[pid] = [c];
                }
                return m;
            },
            {} as CommentsGroupedById) || {};

        // Convert commenter list into a map
        r.commenters?.forEach(c => this.commenters[c.id] = c);
    }

    /**
     * Toggle the current page's readonly status.
     */
    private async pageReadonlyToggle(): Promise<void> {
        // Run the status toggle with the backend
        await this.apiService.pageUpdate(this.pageInfo!.pageId, !this.pageInfo?.isPageReadonly);

        // Reload the page to reflect the state change
        return this.reload();
    }

    /**
     * Approve the comment of the given card.
     */
    private async approveComment(card: CommentCard): Promise<void> {
        // Submit the approval to the backend
        await this.apiService.commentModerate(card.comment.id, true);

        // Update the comment and the card
        card.comment = this.replaceCommentById(card.comment, {isApproved: true});
    }

    /**
     * Delete the comment of the given card.
     */
    private async deleteComment(card: CommentCard): Promise<void> {
        // Run deletion with the backend
        await this.apiService.commentDelete(card.comment.id);

        // Update the comment and the card
        card.comment = this.replaceCommentById(card.comment, {isDeleted: true, markdown: '[deleted]', html: '[deleted]'});
    }

    /**
     * Toggle the given comment's sticky status.
     */
    private async stickyComment(card: CommentCard): Promise<void> {
        // Run the stickiness update with the API
        const isSticky = !card.comment.isSticky;
        await this.apiService.commentSticky(card.comment.id, isSticky);

        // Update the comment
        this.replaceCommentById(card.comment, {isSticky});

        // Rerender comments to reflect the changed stickiness
        this.renderComments();
    }

    /**
     * Vote (upvote, downvote, or undo vote) for the given comment.
     */
    private async voteComment(card: CommentCard, direction: -1 | 0 | 1): Promise<void> {
        // Only registered users can vote
        if (!this.principal) {
            await this.profileBar!.loginUser();

            // Failed to authenticate
            if (!this.principal) {
                return;
            }
        }

        // Run the vote with the backend
        const r = await this.apiService.commentVote(card.comment.id, direction);

        // Update the comment and the card
        card.comment = this.replaceCommentById(card.comment, {score: r.score, direction});
    }

    /**
     * Return a new comment rendering context.
     */
    private makeCommentRenderingContext(): CommentRenderingContext {
        return {
            apiUrl:      this.apiService.basePath,
            root:        this.root!,
            parentMap:   this.parentIdMap!,
            commenters:  this.commenters,
            principal:   this.principal,
            commentSort: this.commentSort,
            isReadonly:  this.pageInfo!.isDomainReadonly || this.pageInfo!.isPageReadonly,
            hideDeleted: this.hideDeleted,
            curTimeMs:   new Date().getTime(),
            onGetAvatar: user => this.createAvatarElement(user),
            onApprove:   card => this.approveComment(card),
            onDelete:    card => this.deleteComment(card),
            onEdit:      card => this.editComment(card),
            onReply:     card => this.addComment(card),
            onSticky:    card => this.stickyComment(card),
            onVote:      (card, direction) => this.voteComment(card, direction),
        };
    }

    /**
     * Save current user's settings.
     */
    private async saveUserSettings(data: UserSettings) {
        // Run the update with the backend
        await this.apiService.authProfileUpdate(this.pageInfo!.pageId, data.notifyReplies, data.notifyModerator);

        // Refresh the auth status and update the profile bar
        await this.updateAuthStatus();

        // Reload all comments to reflect new commenter settings
        await this.reload();
    }

    /**
     * Make a clone of the original comment, replacing the provided properties, and replace that comment in parentIdMap
     * based on its ID.
     * NB: parentId should not change!
     * @param c Original comment.
     * @param props Property overrides for the new clone.
     */
    private replaceCommentById(c: Comment, props?: Partial<Comment>): Comment {
        // Make a clone of the comment, overriding any property in props
        const cc = {...c, ...props};

        // Replace the comment instance in the appropriate list in the parentIdMap
        const a = this.parentIdMap?.[c.parentId ?? ''];
        if (a) {
            const idx = a.findIndex(ci => ci.id === c.id);
            if (idx >= 0) {
                a[idx] = cc;
            }
        }
        return cc;
    }

    /**
     * Create and return a new element representing the avatar for the given user.
     * @param user User to create an avatar element for.
     */
    private createAvatarElement(user?: User): Wrap<any> | undefined {
        // Don't bother if no user
        if (!user) {
            return undefined;
        }

        // Determine if the user is anonymous
        const anonymous = user.id === ANONYMOUS_ID;

        // Render a new element
        return !anonymous && user.hasAvatar ?
            // The user has an avatar: create a new image pointing to the API avatar endpoint
            Wrap.new('img')
                .classes('avatar-img')
                .attr({src: `${this.apiService.basePath}/users/${user.id}/avatar`, loading: 'lazy', alt: ''}) :
            // The user has no avatar: render a circle containing the initial
            UIToolkit.div('avatar', `bg-${anonymous ? 'anonymous' : Utils.colourIndex(user.id)}`)
                .html(anonymous ? '' : user.name[0].toUpperCase());
    }
}
