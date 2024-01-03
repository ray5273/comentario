import { Comment, Commenter, InstanceConfig, InstanceDynamicConfigItem, InstanceDynamicConfigKey, InstanceStaticConfig, PageInfo, Principal, UUID } from './models';
import { HttpClient, HttpHeaders } from './http-client';
import { Utils } from './utils';

export interface ApiErrorResponse {
    readonly id?:      string;
    readonly message?: string;
    readonly details?: string;
}

export interface ApiCommentListResponse {
    /** Page info. */
    readonly pageInfo: PageInfo;
    /** Comments on the page. */
    readonly comments?: Comment[];
    /** Commenters, who authored comments on the page (except those corresponding to deleted users). */
    readonly commenters?: Commenter[];
}

export interface ApiCommentNewResponse {
    /** Added comment. */
    readonly comment: Comment;
    /** Commenter that corresponds to the current user. */
    readonly commenter: Commenter;
}

export interface ApiCommentPreviewResponse {
    /** Rendered comment HTML. */
    readonly html: string;
}

export interface ApiCommentUpdateResponse {
    readonly comment: Comment;
}

export interface ApiCommentVoteResponse {
    readonly score: number;
}

export interface ApiConfigResponse {
    staticConfig:   InstanceStaticConfig;
    dynamicConfig?: InstanceDynamicConfigItem[];
}

export interface ApiAuthSignupResponse {
    /** Whether the user has been immediately confirmed. */
    readonly isConfirmed: boolean;
}

export interface ApiAuthLoginResponse {
    /** Session token to authenticate subsequent API requests with. */
    readonly sessionToken: string;
    /** Authenticated principal. */
    readonly principal: Principal;
}

export interface ApiAuthLoginTokenNewResponse {
    /** New anonymous token. */
    readonly token: string;
}

export class ApiService {

    /** Base64-encoded representation of a 32-byte zero-filled array (2 zero UUIDs). */
    static readonly AnonymousUserSessionToken = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

    /** Session token cookie name. */
    static readonly SessionTokenCookieName = 'comentario_commenter_session';

    /** Authenticated principal, undefined if unknown, null if unauthenticated. */
    private _principal: Principal | null | undefined;

    /** User/session token to authenticate requests with, undefined if unknown. */
    private _userSessionToken?: string;

    /** HTTP client we'll use for API requests. */
    private readonly httpClient = new HttpClient(this.basePath, this.onBeforeRequest, this.onError);

    constructor(
        readonly basePath: string,
        private readonly onBeforeRequest?: () => void,
        private readonly onError?: (error: any) => void,
    ) {}

    /**
     * Return the currently authenticated principal or undefined if the user isn't authenticated.
     */
    async getPrincipal(): Promise<Principal | undefined> {
        // If the auth status is unknown
        if (this._principal === undefined) {
            // If there's no session token, try to restore it from the cookie
            if (this._userSessionToken === undefined) {
                this._userSessionToken = Utils.getCookie(ApiService.SessionTokenCookieName);
            }

            // If the session isn't anonymous, retrieve the currently authenticated principal using it
            if (this._userSessionToken && this._userSessionToken !== ApiService.AnonymousUserSessionToken) {
                this._principal = await this.fetchPrincipal() ?? null;
            }

            // Store any auth changes
            this.storeAuth(this._principal, this._userSessionToken);
        }
        return this._principal ?? undefined;
    }

    /**
     * Store the current authentication status.
     * @param principal Currently authenticated principal, if any.
     * @param sessionToken User session token.
     */
    storeAuth(principal: Principal | null | undefined, sessionToken?: string) {
        this._principal = principal ?? null;
        const token = (principal && sessionToken) ? sessionToken : ApiService.AnonymousUserSessionToken;

        // If the token changes
        if (this._userSessionToken !== token) {
            this._userSessionToken = token;

            // Store the session in a cookie, setting it to expire after one month
            const exp = new Date();
            exp.setTime(exp.getTime() + 30 * 24 * 60 * 60 * 1000);
            Utils.setCookie(ApiService.SessionTokenCookieName, this._userSessionToken, exp.toUTCString());
        }
    }

    /**
     * Sign a commenter in using local (password-based) authentication.
     * @param email Commenter's email.
     * @param password Commenter's password.
     * @param host Host the commenter is signing in on.
     */
    async authLogin(email: string, password: string, host: string): Promise<void> {
        const r = await this.httpClient.post<ApiAuthLoginResponse>('embed/auth/login', {email, password, host});
        this.storeAuth(r.principal, r.sessionToken);
    }

    /**
     * Sign a commenter in using token authentication (after a successful federated authentication).
     * @param token Token.
     * @param host Host the commenter is signing in on.
     */
    async authLoginToken(token: string, host: string): Promise<void> {
        const r = await this.httpClient.put<ApiAuthLoginResponse>('embed/auth/login/token', {host}, {Authorization: `Bearer ${token}`});
        this.storeAuth(r.principal, r.sessionToken);
    }

    /**
     * Log the currently signed-in commenter out.
     */
    async authLogout(): Promise<void> {
        await this.httpClient.post<void>('embed/auth/logout', undefined, this.addAuth());
        this.storeAuth(null);
    }

    /**
     * Obtain an anonymous token with the "login" scope. It's supposed to be used for subsequent federated
     * authentication.
     */
    async authNewLoginToken(): Promise<string> {
        const r = await this.httpClient.post<ApiAuthLoginTokenNewResponse>('embed/auth/login/token');
        return r.token;
    }

    /**
     * Update the current user's profile.
     * @param pageId ID of the page to apply user notification settings on.
     * @param notifyReplies Whether the user is to be notified about replies to their comments.
     * @param notifyModerator Whether the user is to receive moderator notifications.
     */
    async authProfileUpdate(pageId: UUID, notifyReplies: boolean, notifyModerator: boolean): Promise<void> {
        await this.httpClient.put<void>('embed/auth/user', {pageId, notifyReplies, notifyModerator}, this.addAuth());

        // Reload the principal to reflect the updates
        this._principal = await this.fetchPrincipal() ?? null;
    }

    /**
     * Sign up as a new commenter. Return whether the user has been immediately confirmed.
     * @param email User's email.
     * @param name User's full name.
     * @param password User's password.
     * @param websiteUrl Optional website URL of the user.
     * @param url URL the user signed up on.
     */
    async authSignup(email: string, name: string, password: string, websiteUrl: string | undefined, url: string): Promise<boolean> {
        const r = await this.httpClient.post<ApiAuthSignupResponse>('embed/auth/signup', {email, name, password, websiteUrl, url});
        return r.isConfirmed;
    }

    /**
     * Delete a comment.
     * @param id ID of the comment to delete.
     */
    async commentDelete(id: UUID): Promise<void> {
        return this.httpClient.delete<void>(`embed/comments/${id}`, undefined, this.addAuth());
    }

    /**
     * Get a list of comments and commenters for the given host/path combination.
     * @param host Host the comments reside on.
     * @param path Path of the page the comments reside on.
     */
    async commentList(host: string, path: string): Promise<ApiCommentListResponse> {
        return this.httpClient.post<ApiCommentListResponse>('embed/comments', {host, path}, this.addAuth());
    }

    /**
     * Moderate a comment.
     * @param id ID of the comment to moderate.
     * @param approve Whether to approve the comment.
     */
    async commentModerate(id: UUID, approve: boolean): Promise<void> {
        return this.httpClient.post<void>(`embed/comments/${id}/moderate`, {approve}, this.addAuth());
    }

    /**
     * Add a new comment.
     * @param host Host the page resides on.
     * @param path Path to the page to create a comment on.
     * @param anonymous Whether the user chose to comment anonymously.
     * @param parentId Optional ID of the parent comment for the new one. If omitted, a root comment will be added.
     * @param markdown Comment text in the Markdown format.
     */
    async commentNew(host: string, path: string, anonymous: boolean, parentId: UUID | undefined, markdown: string): Promise<ApiCommentNewResponse> {
        return this.httpClient.put<ApiCommentNewResponse>('embed/comments', {host, path, anonymous, parentId, markdown}, this.addAuth());
    }

    /**
     * Render comment text into HTML.
     * @param markdown Comment text in the Markdown format.
     */
    async commentPreview(markdown: string): Promise<string> {
        const r = await this.httpClient.post<ApiCommentPreviewResponse>('embed/comments/preview', {markdown});
        return r.html;
    }

    /**
     * Set sticky value for specified comment.
     * @param id ID of the comment to update.
     * @param sticky Stickiness value.
     */
    async commentSticky(id: UUID, sticky: boolean): Promise<void> {
        return this.httpClient.post<void>(`embed/comments/${id}/sticky`, {sticky}, this.addAuth());
    }

    /**
     * Update an existing comment.
     * @param id ID of the comment to update.
     * @param markdown Comment text in the Markdown format.
     */
    async commentUpdate(id: UUID, markdown: string): Promise<ApiCommentUpdateResponse> {
        return this.httpClient.put<ApiCommentUpdateResponse>(`embed/comments/${id}`, {markdown}, this.addAuth());
    }

    /**
     * Vote for specified comment.
     * @param id ID of the comment to update.
     * @param direction Vote direction.
     */
    async commentVote(id: UUID, direction: -1 | 0 | 1): Promise<ApiCommentVoteResponse> {
        return this.httpClient.post<ApiCommentVoteResponse>(`embed/comments/${id}/vote`, {direction}, this.addAuth());
    }

    /**
     * Obtain instance configuration.
     */
    async configGet(): Promise<InstanceConfig> {
        const r = await this.httpClient.get<ApiConfigResponse>('config');
        // Convert the dynamic config into a map
        return {
            staticConfig:  r.staticConfig,
            dynamicConfig: new Map<InstanceDynamicConfigKey, InstanceDynamicConfigItem>(r.dynamicConfig?.map(i => [i.key, i])),
        };
    }

    /**
     * Update specified page's properties
     * @param id ID of the page to update.
     * @param isReadonly Whether to set the page to readonly.
     */
    async pageUpdate(id: UUID, isReadonly: boolean): Promise<void> {
        return this.httpClient.put<void>(`embed/page/${id}`, {isReadonly}, this.addAuth());
    }

    /**
     * Add the user session auth header to the provided headers, but only if there's a user session.
     * @param headers Headers to amend.
     * @private
     */
    private addAuth(headers?: HttpHeaders): HttpHeaders {
        const h = headers || {};
        if (this._userSessionToken && this._userSessionToken !== ApiService.AnonymousUserSessionToken) {
            h['X-User-Session'] = this._userSessionToken;
        }
        return h;
    }

    /**
     * Forcefully fetch the logged-in principal.
     */
    private async fetchPrincipal(): Promise<Principal | undefined> {
        try {
            return await this.httpClient.post<Principal | undefined>('embed/auth/user', undefined, this.addAuth());
        } catch (e) {
            // On any error consider the user unauthenticated
            console.error(e);
            return undefined;
        }
    }
}
