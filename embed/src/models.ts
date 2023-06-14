export type UUID = string;

export type StringBooleanMap = { [k: string]: boolean };

/** User abstraction. **/
export interface User {
    readonly id:          UUID;    // Unique user ID
    readonly email:       string;  // Email address of the user
    readonly name:        string;  // Full name of the user
    readonly websiteUrl:  string;  // URL of the user's website
    readonly hasAvatar:   boolean; // Whether the user has an avatar image
    readonly isModerator: boolean; // Whether the user is a moderator on this specific domain
    readonly isCommenter: boolean; // Whether the user is a commenter on this specific domain (false means the user is read-only)
}

/** Authenticated or anonymous user. */
export interface Principal extends User {
    readonly isLocal:         boolean; // Whether the user is authenticated locally (as opposed to via a federated identity provider)
    readonly isConfirmed:     boolean; // Whether the user has confirmed their email address
    readonly isOwner:         boolean; // Whether the user is an owner of the domain (only for commenter auth)
    readonly notifyReplies:   boolean; // Whether the user is to be notified about replies to their comments (only for commenter auth)
    readonly notifyModerator: boolean; // Whether the user is to receive moderator notifications (only for commenter auth)
}

/** Comment residing on a page. */
export interface Comment {
    readonly id:          UUID;    // Unique record ID
    readonly parentId?:   string;  // Parent record ID, null if it's a root comment on the page
    readonly pageId:      string;  // ID of the page
    readonly markdown:    string;  // Comment text in markdown
    readonly html:        string;  // Rendered comment text in HTML
    readonly score:       number;  // Comment score
    readonly isSticky:    boolean; // Whether the comment is sticky (attached to the top of page)
    readonly isApproved:  boolean; // Whether the comment is approved and can be seen by everyone
    readonly isSpam:      boolean; // Whether the comment is flagged as (potential) spam
    readonly isDeleted:   boolean; // Whether the comment is marked as deleted
    readonly createdTime: string;  // When the comment was created
    readonly userCreated: string;  // ID of the user who created the comment
    readonly direction:   number;  // Vote direction for the current user
}

/** Stripped-down, read-only version of the user who authored a comment. For now equivalent to User. */
export type Commenter = User;

/** Information about a page displaying comments. */
export interface PageInfo {
    readonly domainId:         UUID;        // Domain ID
    readonly domainName:       string;      // Domain display name
    readonly pageId:           UUID;        // Page ID
    readonly isDomainReadonly: boolean;     // Whether the domain is readonly (no new comments are allowed)
    readonly isPageReadonly:   boolean;     // Whether the page is readonly (no new comments are allowed)
    readonly authAnonymous:    boolean;     // Whether anonymous comments are allowed
    readonly authLocal:        boolean;     // Whether local authentication is allowed
    readonly authSso:          boolean;     // Whether SSO authentication is allowed
    readonly ssoUrl:           string;      // SSO provider URL
    readonly defaultSort:      CommentSort; // Default comment sorting for domain
    readonly idps?:            string[];    // List of IDs of enabled federated identity providers
}

export type CommentsGroupedById = { [k: UUID]: Comment[] };

export type CommenterMap = { [k: UUID]: Commenter };

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

/** Identity provider data. */
export interface IdentityProvider {
    readonly id:    string; // Provider ID
    readonly name:  string; // Provider name
    readonly icon?: string; // Provider icon name
}
