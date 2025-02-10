import { Comment, Commenter, PageInfo, Principal, UUID } from './models';
import { HttpClient, HttpHeaders } from './http-client';
import { Utils } from './utils';

export interface ApiErrorResponse {
    readonly id?:      string;
    readonly message?: string;
    readonly details?: string;
}

export type ApiI18nMessageResponse = Record<string, string>;

export interface ApiCommentCountsResponse {
    /** Comment counts per path. */
    readonly commentCounts: Record<string, number>;
}

export interface ApiCommentListResponse {
    /** Page info. */
    readonly pageInfo: PageInfo;
    /** Comments on the page. */
    readonly comments?: Comment[];
    /** Commenters, who authored comments on the page (except those corresponding to deleted users). */
    readonly commenters?: Commenter[];
}

export interface ApiCommentGetResponse {
    /** Requested comment. */
    readonly comment: Comment;
    /** Commenter who authored the comment. */
    readonly commenter?: Commenter;
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
    private readonly httpClient: HttpClient;

    /** Callback that gets invoked before executing a request. It's supposed to clean up any displayed error status. */
    private _onBeforeRequest?: () => void;

    /** Callback that gets invoked when an API error occurs. */
    private _onError?: (error: any) => void;

    constructor(
        private readonly baseUrl: string,

    ) {
        this.httpClient = new HttpClient(baseUrl, () => this._onBeforeRequest?.(), err => this._onError?.(err));
    }

    set onBeforeRequest(v: typeof this._onBeforeRequest | undefined) {
        this._onBeforeRequest = v;
    }

    set onError(v: typeof this._onError | undefined) {
        this._onError = v;
    }

    /**
     * Return the URL for the given user's avatar image.
     * @param userId ID of the user to get avatar for.
     * @param size Size of the requested avatar.
     */
    getAvatarUrl(userId: string, size: 'S' | 'M' | 'L'): string {
        return Utils.joinUrl(this.baseUrl, 'users', userId, 'avatar') + '?' + new URLSearchParams({size}).toString();
    }

    /**
     * Return the URL for initiating OAuth login flow using the given identity provider.
     * @param idp Identity provider to initiate authentication with.
     * @param host Host the user is signing in on.
     * @param token Anonymous token to bind to the user session.
     */
    getOAuthInitUrl(idp: string, host: string, token: string): string {
        return Utils.joinUrl(this.baseUrl, 'oauth', idp) + '?' + new URLSearchParams({host, token}).toString();
    }

    /**
     * Return the base URL for the comment RSS feed.
     */
    getCommentRssUrl(): string {
        return Utils.joinUrl(this.baseUrl, 'rss/comments');
    }

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
            Utils.setCookie(ApiService.SessionTokenCookieName, this._userSessionToken, 30);
        }
    }

    async i18nMessages(lang: string | null | undefined): Promise<ApiI18nMessageResponse> {
        return await this.httpClient.get<ApiI18nMessageResponse>(`embed/i18n/${lang || 'unknown'}/messages`);
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
     * Obtain a user-bound or anonymous token with the "login" scope. An anonymous token is supposed to be used for
     * subsequent federated authentication, and a user-bound one for a subsequent login.
     * @param anonymous Whether to request an anonymous token.
     */
    async authNewLoginToken(anonymous: boolean): Promise<string> {
        const r = await this.httpClient.post<ApiAuthLoginTokenNewResponse>(
            'embed/auth/login/token',
            undefined,
            anonymous ? undefined : this.addAuth());
        return r.token;
    }

    /**
     * Update the current user's settings for the current domain.
     * @param domainId ID of the domain to apply user settings on.
     * @param notifyReplies Whether the user is to be notified about replies to their comments.
     * @param notifyModerator Whether the user is to receive moderator notifications.
     * @param notifyCommentStatus Whether the user is to be notified about status changes (approved/rejected) of their
     *     comments.
     */
    async authUserSettingsUpdate(domainId: UUID, notifyReplies: boolean, notifyModerator: boolean, notifyCommentStatus: boolean): Promise<void> {
        await this.httpClient.put<void>('embed/auth/user', {domainId, notifyReplies, notifyModerator, notifyCommentStatus}, this.addAuth());

        // Reload the principal to reflect the updates
        this._principal = await this.fetchPrincipal() ?? null;
    }

    /**
     * Sign up as a new commenter. Return whether the user has been immediately confirmed.
     * @param domainId ID of the current domain.
     * @param email User's email.
     * @param name User's full name.
     * @param password User's password.
     * @param websiteUrl Optional website URL of the user.
     * @param url URL the user signed up on.
     */
    async authSignup(domainId: UUID, email: string, name: string, password: string, websiteUrl: string | undefined, url: string): Promise<boolean> {
        const r = await this.httpClient.post<ApiAuthSignupResponse>('embed/auth/signup', {domainId, email, name, password, websiteUrl, url});
        return r.isConfirmed;
    }

    /**
     * Fetch the count of comments on the given page paths.
     * @param host Host the comments reside on.
     * @param paths Paths of the pages to retrieve comment counts for. A maximum of 32 elements is supported.
     */
    async commentCount(host: string, paths: string[]): Promise<ApiCommentCountsResponse> {
        return this.httpClient.post<ApiCommentCountsResponse>('embed/comments/counts', {host, paths});
    }

    /**
     * Delete a comment.
     * @param id ID of the comment to delete.
     */
    async commentDelete(id: UUID): Promise<void> {
        return this.httpClient.delete<void>(`embed/comments/${id}`, undefined, this.addAuth());
    }

    /**
     * Fetch the specified comment and the related commenter.
     * @param id ID of the comment to retrieve.
     */
    async commentGet(id: UUID): Promise<ApiCommentGetResponse> {
        return this.httpClient.get<ApiCommentGetResponse>(`embed/comments/${id}`, this.addAuth());
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
     * @param unregistered Whether the user chose to comment without registration.
     * @param authorName Name of the author in case unregistered is true.
     * @param parentId Optional ID of the parent comment for the new one. If omitted, a root comment will be added.
     * @param markdown Comment text in the Markdown format.
     */
    async commentNew(host: string, path: string, unregistered: boolean, authorName: string | undefined, parentId: UUID | undefined, markdown: string): Promise<ApiCommentNewResponse> {
        return this.httpClient.put<ApiCommentNewResponse>(
            'embed/comments',
            {host, path, unregistered, authorName, parentId, markdown},
            this.addAuth());
    }

    /**
     * Render comment text into HTML.
     * @param domainId ID of the current domain.
     * @param markdown Comment text in the Markdown format.
     */
    async commentPreview(domainId: UUID, markdown: string): Promise<string> {
        const r = await this.httpClient.post<ApiCommentPreviewResponse>('embed/comments/preview', {domainId, markdown});
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
