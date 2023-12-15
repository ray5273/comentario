import { Comment, Commenter, InstanceConfig, InstanceDynamicConfigItem, InstanceDynamicConfigKey, InstanceStaticConfig, PageInfo, Principal, UUID } from './models';
import { HttpClient } from './http-client';

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

export interface ApiAuthLoginTokenNewResponse {
    /** New anonymous token. */
    readonly token: string;
}

export class ApiService {

    /** Whether authentication status is known. */
    private _authStatusKnown = false;

    /** Authenticated principal, if any. */
    private _principal?: Principal;

    /** HTTP client we'll use for API requests. */
    private readonly apiClient = new HttpClient(this.basePath, this.onBeforeRequest, this.onError);

    constructor(
        readonly basePath: string,
        private readonly onBeforeRequest?: () => void,
        private readonly onError?: (error: any) => void,
    ) {}

    set principal(p: Principal | undefined) {
        this._principal = p;
        this._authStatusKnown = true;
    }

    /**
     * Sign a commenter in using local (password-based) authentication.
     * @param email Commenter's email.
     * @param password Commenter's password.
     * @param host Host the commenter is signing in on.
     */
    async authLogin(email: string, password: string, host: string): Promise<void> {
        this.principal = await this.apiClient.post<Principal>('embed/auth/login', {email, password, host});
    }

    /**
     * Sign a commenter in using token authentication (after a successful federated authentication).
     * @param token Token.
     * @param host Host the commenter is signing in on.
     */
    async authLoginToken(token: string, host: string): Promise<void> {
        this.principal = await this.apiClient.put<Principal>('embed/auth/login/token', {host}, {Authorization: `Bearer ${token}`});
    }

    /**
     * Log the currently signed-in commenter out.
     */
    async authLogout(): Promise<void> {
        await this.apiClient.post<void>('auth/logout');
        this.principal = undefined;
    }

    /**
     * Obtain an anonymous token with the "login" scope. It's supposed to be used for subsequent federated
     * authentication.
     */
    async authNewLoginToken(): Promise<string> {
        const r = await this.apiClient.post<ApiAuthLoginTokenNewResponse>('auth/login/token');
        return r.token;
    }

    /**
     * Return the currently authenticated principal or undefined if the user isn't authenticated.
     */
    async authPrincipal(): Promise<Principal | undefined> {
        // Retrieve the currently authenticated principal, if needed
        if (!this._authStatusKnown) {
            await this.updatePrincipal();
        }
        return this._principal;
    }

    /**
     * Update the current user's profile.
     * @param pageId ID of the page to apply user notification settings on.
     * @param notifyReplies Whether the user is to be notified about replies to their comments.
     * @param notifyModerator Whether the user is to receive moderator notifications.
     */
    async authProfileUpdate(pageId: UUID, notifyReplies: boolean, notifyModerator: boolean): Promise<void> {
        await this.apiClient.put<void>('embed/auth/user', {pageId, notifyReplies, notifyModerator});

        // Reload the principal to reflect the updates
        return this.updatePrincipal();
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
        const r = await this.apiClient.post<ApiAuthSignupResponse>('embed/auth/signup', {email, name, password, websiteUrl, url});
        return r.isConfirmed;
    }

    /**
     * Delete a comment.
     * @param id ID of the comment to delete.
     */
    async commentDelete(id: UUID): Promise<void> {
        return this.apiClient.delete<void>(`embed/comments/${id}`);
    }

    /**
     * Get a list of comments and commenters for the given host/path combination.
     * @param host Host the comments reside on.
     * @param path Path of the page the comments reside on.
     */
    async commentList(host: string, path: string): Promise<ApiCommentListResponse> {
        return this.apiClient.post<ApiCommentListResponse>('embed/comments', {host, path});
    }

    /**
     * Moderate a comment.
     * @param id ID of the comment to moderate.
     * @param approve Whether to approve the comment.
     */
    async commentModerate(id: UUID, approve: boolean): Promise<void> {
        return this.apiClient.post<void>(`embed/comments/${id}/moderate`, {approve});
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
        return this.apiClient.put<ApiCommentNewResponse>('embed/comments', {host, path, anonymous, parentId, markdown});
    }


    /**
     * Set sticky value for specified comment.
     * @param id ID of the comment to update.
     * @param sticky Stickiness value.
     */
    async commentSticky(id: UUID, sticky: boolean): Promise<void> {
        return this.apiClient.post<void>(`embed/comments/${id}/sticky`, {sticky});
    }

    /**
     * Update an existing comment.
     * @param id ID of the comment to update.
     * @param markdown Comment text in the Markdown format.
     */
    async commentUpdate(id: UUID, markdown: string): Promise<ApiCommentUpdateResponse> {
        return this.apiClient.put<ApiCommentUpdateResponse>(`embed/comments/${id}`, {markdown});
    }

    /**
     * Vote for specified comment.
     * @param id ID of the comment to update.
     * @param direction Vote direction.
     */
    async commentVote(id: UUID, direction: -1 | 0 | 1): Promise<ApiCommentVoteResponse> {
        return this.apiClient.post<ApiCommentVoteResponse>(`embed/comments/${id}/vote`, {direction});
    }

    /**
     * Obtain instance configuration.
     */
    async configGet(): Promise<InstanceConfig> {
        const r = await this.apiClient.get<ApiConfigResponse>('config');
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
        return this.apiClient.put<void>(`embed/page/${id}`, {isReadonly});
    }

    /**
     * Forcefully fetch the logged-in principal.
     */
    private async updatePrincipal() {
        try {
            this.principal = await this.apiClient.get<Principal | undefined>('user');
        } catch (e) {
            // On any error consider the user unauthenticated
            console.error(e);
        }
    }
}
