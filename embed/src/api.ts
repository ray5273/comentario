import { Comment, Commenter, Email, SortPolicy } from './models';

export interface ApiSelfResponse {
    commenter?: Commenter;
    email?:     Email;
}

export interface ApiIdentityProvider {
    id:   string;
    name: string;
}

export interface ApiCommentListResponse {
    requireIdentification: boolean;
    isModerator:           boolean;
    isFrozen:              boolean;
    attributes:            any;
    comments:              Comment[];
    commenters:            Commenter[];
    idps:                  ApiIdentityProvider[];
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
