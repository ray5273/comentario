import { HttpClientError } from './http-client';
import { ApiErrorResponse } from './api';

export type UUID = string;

export type StringBooleanMap = { [k: string]: boolean };

/** UI language. **/
export interface UILanguage {
    readonly id:          string; // Language ID, such as 'en' or 'zh_CN'
    readonly nameEnglish: string; // Language name in English
    readonly nameNative:  string; // Language name in the language self
}

/** Federated identity provider ID */
export type FederatedIdpId = 'facebook' | 'github' | 'gitlab' | 'google' | 'linkedin' | 'twitter';

/** Federated identity provider info */
export interface FederatedIdentityProvider {
    /** Provider ID */
    readonly id: FederatedIdpId;
    /** Provider display name */
    readonly name: string;
    /** Provider icon name */
    readonly icon: string;
}

/** Static instance configuration. */
export interface InstanceStaticConfig {
    /** Base Comentario URL */
    readonly baseUrl: string;
    /** Base Documentation URL */
    readonly baseDocsUrl: string;
    /** Comentario version */
    readonly version: string;
    /** Server build date */
    readonly buildDate: string;
    /** Current server date and time */
    readonly serverTime: string;
    /** Default interface language ID */
    readonly defaultLangId: string;
    /** URL of a HTML page to display on the homepage. If not provided, the homepage will redirect to login (for  unauthenticated user) or dashboard (for authenticated) */
    readonly homeContentUrl?: string;
    /** Configured federated identity providers */
    readonly federatedIdps?: FederatedIdentityProvider[];
    /** Max number of database rows returned per page */
    readonly resultPageSize: number;
    /** Available UI languages */
    readonly uiLanguages?: UILanguage[];
}

/** Dynamic configuration keys. */
export enum InstanceDynamicConfigKey {
    authSignupConfirmCommenter        = 'auth.signup.confirm.commenter',
    authSignupConfirmUser             = 'auth.signup.confirm.user',
    authSignupEnabled                 = 'auth.signup.enabled',
    domainDefaultsEnableCommentVoting = 'domain.defaults.comments.enableVoting',
    domainDefaultsShowDeletedComments = 'domain.defaults.comments.showDeleted',
    domainDefaultsUseGravatar         = 'domain.defaults.useGravatar',
    markdownImagesEnabled             = 'markdown.images.enabled',
    markdownLinksEnabled              = 'markdown.links.enabled',
    markdownTablesEnabled             = 'markdown.tables.enabled',
    operationNewOwnerEnabled          = 'operation.newOwner.enabled',
}


/** Dynamic instance configuration item datatype. */
export type InstanceDynamicConfigItemDatatype = 'boolean';

/** Dynamic instance configuration item. */
export interface InstanceDynamicConfigItem {
    /** Item key */
    readonly key: InstanceDynamicConfigKey;
    /** Item value */
    readonly value: string;
    /** Item description */
    readonly description?: string;
    /** Item datatype */
    readonly datatype?: InstanceDynamicConfigItemDatatype;
    /** Timestamp when the item was last updated in the database */
    readonly updatedTime?: string;
    /** Reference to the user who last updated the item in the database */
    readonly userUpdated?: string;
    /** Item's default value */
    readonly defaultValue?: string;
}

/** Instance configuration. */
export interface InstanceConfig {
    staticConfig:  InstanceStaticConfig;
    dynamicConfig: Map<InstanceDynamicConfigKey, InstanceDynamicConfigItem>;
}

export const DefaultInstanceConfig: InstanceConfig = {
    staticConfig: {
        baseUrl:        'https://comentario.app',
        baseDocsUrl:    'https://docs.comentario.app',
        version:        '',
        buildDate:      '',
        serverTime:     '',
        defaultLangId:  'en',
        homeContentUrl: 'https://docs.comentario.app/en/embed/front-page/',
        resultPageSize: 25,
    },
    dynamicConfig: new Map(),
};

/** User abstraction. **/
export interface User {
    readonly id:          UUID;    // Unique user ID
    readonly email:       string;  // Email address of the user
    readonly name:        string;  // Full name of the user
    readonly websiteUrl:  string;  // URL of the user's website
    readonly hasAvatar:   boolean; // Whether the user has an avatar image
    readonly isModerator: boolean; // Whether the user is a moderator on this specific domain
    readonly isCommenter: boolean; // Whether the user is a commenter on this specific domain (false means the user is read-only)
    readonly colourIndex: number;  // Colour hash, number based on the user's ID
}

/** Authenticated or anonymous user. */
export interface Principal extends User {
    readonly isSuperuser:     boolean; // Whether the user is a "super user" (instance admin)
    readonly isLocal:         boolean; // Whether the user is authenticated locally (as opposed to via a federated identity provider)
    readonly isConfirmed:     boolean; // Whether the user has confirmed their email address
    readonly isOwner:         boolean; // Whether the user is an owner of the domain
    readonly notifyReplies:   boolean; // Whether the user is to be notified about replies to their comments
    readonly notifyModerator: boolean; // Whether the user is to receive moderator notifications
}

/** Comment residing on a page. */
export interface Comment {
    readonly id:           UUID;    // Unique record ID
    readonly parentId?:    string;  // Parent record ID, null if it's a root comment on the page
    readonly pageId:       string;  // ID of the page
    readonly markdown:     string;  // Comment text in markdown
    readonly html:         string;  // Rendered comment text in HTML
    readonly score:        number;  // Comment score
    readonly isSticky:     boolean; // Whether the comment is sticky (attached to the top of page)
    readonly isApproved:   boolean; // Whether the comment is approved and can be seen by everyone
    readonly isPending:    boolean; // Whether the comment is pending moderator approval
    readonly isDeleted:    boolean; // Whether the comment is marked as deleted
    readonly createdTime:  string;  // When the comment was created
    readonly userCreated?: string;  // ID of the user who created the comment. Null if the user has since been deleted
    readonly direction:    number;  // Vote direction for the current user
}

/** Stripped-down, read-only version of the user who authored a comment. For now equivalent to User. */
export type Commenter = User;

/** Information about a page displaying comments */
export interface PageInfo {
    /** Domain ID */
    readonly domainId: string;
    /** Domain display name */
    readonly domainName: string;
    /** Page ID */
    readonly pageId: string;
    /** Whether the domain is readonly (no new comments are allowed) */
    readonly isDomainReadonly: boolean;
    /** Whether the page is readonly (no new comments are allowed) */
    readonly isPageReadonly: boolean;
    /** Whether anonymous comments are allowed */
    readonly authAnonymous: boolean;
    /** Whether local authentication is allowed */
    readonly authLocal: boolean;
    /** Whether SSO authentication is allowed */
    readonly authSso: boolean;
    /** SSO provider URL */
    readonly ssoUrl: string;
    /** Whether to use a non-interactive SSO login */
    readonly ssoNonInteractive: boolean;
    /** Default comment sort */
    readonly defaultSort: CommentSort;
    /** List of enabled federated identity providers */
    readonly idps?: FederatedIdentityProvider[];
}

export type CommentsGroupedById = { [k: UUID]: Comment[] };

/** Commenter users mapped by their IDs. There will be no entry for a commenter that corresponds to a deleted user. */
export type CommenterMap = { [k: UUID]: Commenter | undefined };

export type ComparatorFunc<T> = (a: T, b: T) => number;

/** Comment sorting. 1st letter defines the property, 2nd letter the direction. */
export type CommentSort = 'ta' | 'td' | 'sa' | 'sd';

export interface CommentSortProps {
    readonly label:      string;
    readonly comparator: ComparatorFunc<Comment>;
}

export interface SignupData {
    readonly email:       string;
    readonly name:        string;
    readonly password:    string;
    readonly websiteUrl?: string;
}

export interface UserSettings {
    notifyModerator: boolean; // Whether to send moderator notifications to the user
    notifyReplies:   boolean; // Whether to send reply notifications to the user
}

export const ANONYMOUS_ID: UUID = '00000000-0000-0000-0000-000000000000';

export const sortingProps: { [k in CommentSort]: CommentSortProps } = {
    sa: {label: '',        comparator: (a, b) => a.score - b.score},
    sd: {label: 'Upvotes', comparator: (a, b) => b.score - a.score},
    td: {label: 'Newest',  comparator: (a, b) => -a.createdTime.localeCompare(b.createdTime)},
    ta: {label: 'Oldest',  comparator: (a, b) => a.createdTime.localeCompare(b.createdTime)},
};

/** Generic message displayed to the user. */
export interface Message {
    readonly severity: 'ok' | 'error'; // Message severity
    readonly text:     string;         // Message text
    readonly details?: string;         // Optional technical details
}

/**
 * Message variant signifying a success.
 */
export class OkMessage implements Message {

    readonly severity = 'ok';

    constructor(
        readonly text: string,
    ) {}
}

/**
 * Message variant signifying an error.
 */
export class ErrorMessage implements Message {

    readonly severity = 'error';

    constructor(
        readonly text: string,
        readonly details?: string,
    ) {}

    /**
     * Instantiate a new ErrorMessage instance from the given error object. For now, only handle a string and an HTTP
     * error in a special way.
     * @param err Source error object.
     */
    static of(err: any): ErrorMessage {
        let text = 'Unknown error';

        if (typeof err === 'string') {
            text = err;

        } else if (err instanceof HttpClientError) {
            // If there's a response, try to parse it as JSON
            let resp: ApiErrorResponse | undefined;
            if (typeof err.response === 'string') {
                try {
                    resp = JSON.parse(err.response);
                } catch (e) {
                    // Do nothing
                }
            }

            // Translate error ID
            switch (resp?.id) {
                case 'unknown-host':
                    text = 'This domain is not registered in Comentario';
                    break;

                // Not a known error ID
                default:
                    text = resp?.message || err.message || text;
                    if (resp?.details) {
                        text += ` (${resp.details})`;
                    }
            }
        }

        // Details will be a JSON representation of the error
        return new ErrorMessage(text, JSON.stringify(err, undefined, 2));
    }
}

export interface SsoLoginResponse {
    /** Message type */
    readonly type: 'auth.sso.result';
    /** Whether the login was successful */
    readonly success: boolean;
    /** Any error message returned by the identity provider. */
    readonly error?: string;
}
