/** Paths in the administration UI. */
export const PATHS = {
    home: '/en/',

    auth: {
        login:          '/en/auth/login',
        signup:         '/en/auth/signup',
        forgotPassword: '/en/auth/forgotPassword',
        resetPassword:  '/en/auth/resetPassword',
    },

    manage: {
        dashboard: '/en/manage/dashboard',
        domains:   '/en/manage/domains',
        account: {
            profile: '/en/manage/account/profile',
        },
    },
};

/** Paths for the test site. */
export const TEST_PATHS = {
    home:      '/',
    comments:  '/comments/',
    double:    '/double/',
    dynamic:   '/dynamic/',
    noComment: '/nocomment/',
    readonly:  '/readonly/',

    attr: {
        autoInit:         '/attr/auto-init/',
        noFonts:          '/attr/no-fonts/',
        cssOverride:      '/attr/css-override/',
        cssOverrideFalse: '/attr/css-override-false/',
        pageId:           '/attr/page-id/',
    },
};

/** Cypress User implementation. */
export class User implements Cypress.User {

    readonly email:       string;
    readonly password:    string;
    readonly isAnonymous: boolean;
    readonly id:          string;
    readonly name:        string;
    readonly isBanned:    boolean;

    constructor(props: Partial<User>) {
        Object.assign(this, props);
    }

    /**
     * Return a copy of this user with the given password.
     */
    withPassword(password: string): User {
        return new User({...this, password});
    }
}

/** Predefined users. */
export const USERS = {
    anonymous:    new User({isAnonymous: true,  id: '00000000-0000-0000-0000-000000000000', email: '',                           name: 'Anonymous'}),
    root:         new User({isAnonymous: false, id: '00000000-0000-0000-0000-000000000001', email: 'root@comentario.app',        name: 'Root',           password: 'test'}),
    ace:          new User({isAnonymous: false, id: '5787eece-7aa3-44d7-bbba-51866edc4867', email: 'ace@comentario.app',         name: 'Captain Ace',    password: 'test'}),
    king:         new User({isAnonymous: false, id: '2af9ecd2-a32a-4332-8717-396e9af28639', email: 'king@comentario.app',        name: 'Engineer King',  password: 'test'}),
    queen:        new User({isAnonymous: false, id: '98732142-bc83-48e0-be92-f6dbd6976702', email: 'queen@comentario.app',       name: 'Cook Queen',     password: 'test'}),
    jack:         new User({isAnonymous: false, id: '2d01d8dd-0bb1-4281-850e-e943b9f8128a', email: 'jack@comentario.app',        name: 'Navigator Jack', password: 'test'}),
    commenterOne: new User({isAnonymous: false, id: '01d1cb57-d98c-46f6-b270-1198860f642f', email: 'one@blog.com',               name: 'Commenter One',  password: 'user'}),
    commenterTwo: new User({isAnonymous: false, id: '61e2ccdb-4c2f-4b48-9527-fb8443e01a6f', email: 'two@blog.com',               name: 'Commenter Two',  password: 'user'}),
    banned:       new User({isAnonymous: false, id: '460b2681-7411-4a38-b520-b23e2fac2230', email: 'banned@comentario.app',      name: 'Naughty One',    password: 'test', isBanned: true}),
    facebookUser: new User({isAnonymous: false, id: '30f5efad-a266-46f2-8108-acbebba991de', email: 'facebook-user@facebook.com', name: 'Facebook User'}),
    githubUser:   new User({isAnonymous: false, id: '84ba64a4-a723-4bb2-a903-9c89132964f7', email: 'github-user@github.com',     name: 'GitHub User'}),
    gitlabUser:   new User({isAnonymous: false, id: '820a5748-2033-4cb7-90b4-3a7d1eee4cfd', email: 'gitlab-user@gitlab.com',     name: 'GitLab User'}),
    googleUser:   new User({isAnonymous: false, id: 'b5962138-7a26-477c-aaea-50a70ef13696', email: 'google-user@google.com',     name: 'Google User'}),
    linkedinUser: new User({isAnonymous: false, id: '59866240-df40-470b-ab5f-c06fc2ce6dd1', email: 'linkedin-user@linkedin.com', name: 'LinkedIn User'}),
    twitterUser:  new User({isAnonymous: false, id: '28053af1-612b-4d42-b03d-9e30f42f73c2', email: 'twitter-user@twitter.com',   name: 'Twitter User'}),
    ssoUser:      new User({isAnonymous: false, id: '683251c4-e70a-4831-b60c-10c564c894a8', email: 'sso-user@example.com',       name: 'SSO User'}),
};

export enum DYN_CONFIG_ITEMS {
    authSignupEnabled          = 'auth.signup.enabled',
    authSignupConfirmCommenter = 'auth.signup.confirm.commenter',
    authSignupConfirmUser      = 'auth.signup.confirm.user',
    operationNewOwnerEnabled   = 'operation.newOwner.enabled',
    markdownLinksEnabled       = 'markdown.links.enabled',
    markdownImagesEnabled      = 'markdown.images.enabled',
}
