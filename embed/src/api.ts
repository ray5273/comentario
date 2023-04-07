import { Comment, Commenter, Email, IdentityProvider, SortPolicy } from './models';

export interface ApiErrorResponse {
    id?:      string;
    message?: string;
    details?: string;
}

export interface ApiClientConfigResponse {
    baseUrl:       string;
    signupAllowed: boolean;
    idps:          IdentityProvider[];
}

export interface ApiSelfResponse {
    commenter?: Commenter;
    email?:     Email;
}

export interface ApiCommentListResponse {
    requireIdentification: boolean;
    isModerator:           boolean;
    isFrozen:              boolean;
    attributes:            any;
    comments:              Comment[];
    commenters:            Commenter[];
    idps:                  string[];
    defaultSortPolicy:     SortPolicy;
}

export interface ApiCommentNewResponse {
    state:        'unapproved' | 'flagged';
    commentHex:   string;
    commenterHex: string;
    html:         string;
}

export interface ApiCommentEditResponse {
    state?:     'unapproved' | 'flagged';
    commentHex: string;
    html:       string;
}

export interface ApiCommenterTokenNewResponse {
    commenterToken: string;
}

export interface ApiCommenterLoginResponse {
    commenterToken: string;
    commenter:      Commenter;
    email:          Email;
}
