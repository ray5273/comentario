/** Expected available UI languages. */
export const UI_LANGUAGES = {
    'en':      'English (English)',
    'de':      'Deutsch (German)',
    'es':      'español (Spanish)',
    'fr':      'français (French)',
    'nl':      'Nederlands (Dutch)',
    'pt-BR':   'português (Brazilian Portuguese)',
    'ru':      'русский (Russian)',
    'vi':      'Tiếng Việt (Vietnamese)',
    'zh-Hans': '简体中文 (Simplified Chinese)',
    'zh-Hant': '繁體中文 (Traditional Chinese)',
};

/** Canned regular expressions. */
export const REGEXES = {
    datetime:      /^\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2} (?:AM|PM)$/,
    checkDatetime: /^✔\s*\(\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2} (?:AM|PM)\)$/,
    uuid:          /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,

};

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
        dashboard:      '/en/manage/dashboard',
        domains: {
            _:      '/en/manage/domains',
            create: '/en/manage/domains/create',
            id:  (id: string) => ({
                props:      `${PATHS.manage.domains._}/${id}`,
                edit:       `${PATHS.manage.domains._}/${id}/edit`,
                sso:        `${PATHS.manage.domains._}/${id}/sso`,
                pages:      `${PATHS.manage.domains._}/${id}/pages`,
                comments:   `${PATHS.manage.domains._}/${id}/comments`,
                users:      `${PATHS.manage.domains._}/${id}/users`,
                stats:      `${PATHS.manage.domains._}/${id}/stats`,
                operations: `${PATHS.manage.domains._}/${id}/operations`,
                clone:      `${PATHS.manage.domains._}/${id}/clone`,
                import:     `${PATHS.manage.domains._}/${id}/import`,
            }),
            anyId: {
                props:      /^\/en\/manage\/domains\/[-a-f\d]{36}$/,
                edit:       /^\/en\/manage\/domains\/[-a-f\d]{36}\/edit$/,
                sso:        /^\/en\/manage\/domains\/[-a-f\d]{36}\/sso$/,
                pages:      /^\/en\/manage\/domains\/[-a-f\d]{36}\/pages$/,
                comments:   /^\/en\/manage\/domains\/[-a-f\d]{36}\/comments$/,
                users:      /^\/en\/manage\/domains\/[-a-f\d]{36}\/users$/,
                stats:      /^\/en\/manage\/domains\/[-a-f\d]{36}\/stats$/,
                operations: /^\/en\/manage\/domains\/[-a-f\d]{36}\/operations$/,
            },
        },
        users: {
            _: '/en/manage/users',
            id:  (id: string) => ({
                props: `${PATHS.manage.users._}/${id}`,
                edit: `${PATHS.manage.users._}/${id}/edit`,
            }),
        },
        config: {
            _:          '/en/manage/config',
            static:     '/en/manage/config/static',
            dynamic:{
                _:      '/en/manage/config/dynamic',
                edit:   '/en/manage/config/dynamic/edit',
            },
        },
        account: {
            profile:    '/en/manage/account/profile',
            email:      '/en/manage/account/email',
        },
    },
};

/** Paths for the test site. */
export const TEST_PATHS = {
    home:      '/',
    comments:  '/comments/',
    darkMode:  '/dark-mode/',
    double:    '/double/',
    dynamic:   '/dynamic/',
    noComment: '/nocomment/',
    readonly:  '/readonly/',
    looooong:  '/page/with/a/very/long/path/that/will/definitely/have/to/be/wrapped/' +
               'on/display/to/make/it/a/bit/usable.html?' +
               'some_even_more_long_param=long_boring_value_3457290346493563584693847569723456987245869&' +
               'foo=bar&buzz=238974592875469782&' +
               'bux=whatever-28973423498765987249586729847569275469874578969234756938745697834569782349567824596879432756924578692874569234865',

    attr: {
        autoInit:              '/attr/auto-init/',
        autoNonInteractiveSso: '/attr/auto-non-interactive-sso/',
        noFonts:               '/attr/no-fonts/',
        cssOverride:           '/attr/css-override/',
        cssOverrideFalse:      '/attr/css-override-false/',
        pageId:                '/attr/page-id/',
        pageIdAlias:           '/different-page/123',
        maxLevel:              '/attr/max-level/',
        noLiveUpdate:          '/attr/live-update/',
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
    readonly isSuper:     boolean;
    readonly isFederated: boolean;

    constructor(props: Partial<User>) {
        Object.assign(this, props);
    }

    /**
     * Return a copy of this user with the given email.
     */
    withEmail(email: string): User {
        return new User({...this, email});
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
    anonymous:      new User({id: '00000000-0000-0000-0000-000000000000', email: '',                            name: 'Anonymous',       isAnonymous: true}),
    root:           new User({id: '00000000-0000-0000-0000-000000000001', email: 'root@comentario.app',         name: 'Root',            password: 'test', isSuper: true}),
    ace:            new User({id: '5787eece-7aa3-44d7-bbba-51866edc4867', email: 'ace@comentario.app',          name: 'Captain Ace',     password: 'test'}),
    king:           new User({id: '2af9ecd2-a32a-4332-8717-396e9af28639', email: 'king@comentario.app',         name: 'Engineer King',   password: 'test'}),
    queen:          new User({id: '98732142-bc83-48e0-be92-f6dbd6976702', email: 'queen@comentario.app',        name: 'Cook Queen',      password: 'test'}),
    jack:           new User({id: '2d01d8dd-0bb1-4281-850e-e943b9f8128a', email: 'jack@comentario.app',         name: 'Navigator Jack',  password: 'test'}),
    commenterOne:   new User({id: '01d1cb57-d98c-46f6-b270-1198860f642f', email: 'one@blog.com',                name: 'Commenter One',   password: 'user'}),
    commenterTwo:   new User({id: '61e2ccdb-4c2f-4b48-9527-fb8443e01a6f', email: 'two@blog.com',                name: 'Commenter Two',   password: 'user'}),
    commenterThree: new User({id: 'a7ab1d55-cfaa-4f26-a1a6-88cc4c6ce96d', email: 'three@blog.com',              name: 'Commenter Three', password: 'user'}),
    banned:         new User({id: '460b2681-7411-4a38-b520-b23e2fac2230', email: 'banned@comentario.app',       name: 'Naughty One',     password: 'test', isBanned: true}),
    facebookUser:   new User({id: '30f5efad-a266-46f2-8108-acbebba991de', email: 'facebook-user@facebook.com',  name: 'Facebook User',   isFederated: true}),
    githubUser:     new User({id: '84ba64a4-a723-4bb2-a903-9c89132964f7', email: 'github-user@github.com',      name: 'GitHub User',     isFederated: true}),
    gitlabUser:     new User({id: '820a5748-2033-4cb7-90b4-3a7d1eee4cfd', email: 'gitlab-user@gitlab.com',      name: 'GitLab User',     isFederated: true}),
    googleUser:     new User({id: 'b5962138-7a26-477c-aaea-50a70ef13696', email: 'google-user@google.com',      name: 'Google User',     isFederated: true}),
    linkedinUser:   new User({id: '59866240-df40-470b-ab5f-c06fc2ce6dd1', email: 'linkedin-user@linkedin.com',  name: 'LinkedIn User',   isFederated: true}),
    twitterUser:    new User({id: '28053af1-612b-4d42-b03d-9e30f42f73c2', email: 'twitter-user@twitter.com',    name: 'Twitter User',    isFederated: true}),
    ssoUser:        new User({id: '683251c4-e70a-4831-b60c-10c564c894a8', email: 'sso-user@example.com',        name: 'SSO User'}),
    johnDoeSso:     new User({id: '' /* Only known after first login */,  email: 'john.doe.sso@comentario.app', name: 'John Doe'}),
};

/** Predefined cookie names. */
export const COOKIES = {
    embedCommenterSession: 'comentario_commenter_session',
};

export const ConfigKeyDomainDefaultsPrefix = 'domain.defaults.';

/** Domain config item keys. */
export enum DomainConfigKey {
    commentDeletionAuthor    = 'comments.deletion.author',
    commentDeletionModerator = 'comments.deletion.moderator',
    commentEditingAuthor     = 'comments.editing.author',
    commentEditingModerator  = 'comments.editing.moderator',
    enableCommentVoting      = 'comments.enableVoting',
    enableRss                = 'comments.rss.enabled',
    showDeletedComments      = 'comments.showDeleted',
    maxCommentLength         = 'comments.text.maxLength',
    markdownImagesEnabled    = 'markdown.images.enabled',
    markdownLinksEnabled     = 'markdown.links.enabled',
    markdownTablesEnabled    = 'markdown.tables.enabled',
    showLoginForUnauth       = 'login.showForUnauth',
    localSignupEnabled       = 'signup.enableLocal',
    federatedSignupEnabled   = 'signup.enableFederated',
    ssoSignupEnabled         = 'signup.enableSso',
}

/** Config keys representing integer values (as opposed to boolean). */
export const IntegerDomainConfigKeys = new Set<DomainConfigKey>([DomainConfigKey.maxCommentLength]);

/** Instance dynamic config item keys. */
export enum InstanceConfigKey {
    authEmailUpdateEnabled                 = 'auth.emailUpdate.enabled',
    authLoginLocalMaxAttempts              = "auth.login.local.maxAttempts",
    authSignupConfirmCommenter             = 'auth.signup.confirm.commenter',
    authSignupConfirmUser                  = 'auth.signup.confirm.user',
    authSignupEnabled                      = 'auth.signup.enabled',
    integrationsUseGravatar                = 'integrations.useGravatar',
    operationNewOwnerEnabled               = 'operation.newOwner.enabled',
    // Domain defaults
    domainDefaultsCommentDeletionAuthor    = ConfigKeyDomainDefaultsPrefix + DomainConfigKey.commentDeletionAuthor,
    domainDefaultsCommentDeletionModerator = ConfigKeyDomainDefaultsPrefix + DomainConfigKey.commentDeletionModerator,
    domainDefaultsCommentEditingAuthor     = ConfigKeyDomainDefaultsPrefix + DomainConfigKey.commentEditingAuthor,
    domainDefaultsCommentEditingModerator  = ConfigKeyDomainDefaultsPrefix + DomainConfigKey.commentEditingModerator,
    domainDefaultsEnableCommentVoting      = ConfigKeyDomainDefaultsPrefix + DomainConfigKey.enableCommentVoting,
    domainDefaultsEnableRss                = ConfigKeyDomainDefaultsPrefix + DomainConfigKey.enableRss,
    domainDefaultsShowDeletedComments      = ConfigKeyDomainDefaultsPrefix + DomainConfigKey.showDeletedComments,
    domainDefaultsMaxCommentLength         = ConfigKeyDomainDefaultsPrefix + DomainConfigKey.maxCommentLength,
    domainDefaultsMarkdownImagesEnabled    = ConfigKeyDomainDefaultsPrefix + DomainConfigKey.markdownImagesEnabled,
    domainDefaultsMarkdownLinksEnabled     = ConfigKeyDomainDefaultsPrefix + DomainConfigKey.markdownLinksEnabled,
    domainDefaultsMarkdownTablesEnabled    = ConfigKeyDomainDefaultsPrefix + DomainConfigKey.markdownTablesEnabled,
    domainDefaultsShowLoginForUnauth       = ConfigKeyDomainDefaultsPrefix + DomainConfigKey.showLoginForUnauth,
    domainDefaultsLocalSignupEnabled       = ConfigKeyDomainDefaultsPrefix + DomainConfigKey.localSignupEnabled,
    domainDefaultsFederatedSignupEnabled   = ConfigKeyDomainDefaultsPrefix + DomainConfigKey.federatedSignupEnabled,
    domainDefaultsSsoSignupEnabled         = ConfigKeyDomainDefaultsPrefix + DomainConfigKey.ssoSignupEnabled,
}

/** Predefined domains, declared in "creation order", i.e. ordered by ts_created. */
export const DOMAINS = {
    localhost: {id: '3bcdd9c0-5e9b-4724-9d87-8c520fb2b5c2', host: 'localhost:8000',     name: 'Test Site'},
    frozen:    {id: '4d7affab-4db7-4521-aea2-9451e158d642', host: 'lacolhost.com:8000', name: 'Frozen Domain'},
    course:    {id: 'b5cacc60-6d24-45ca-af03-c62e863587b5', host: 'course.example.com', name: 'Course Domain'},
    system:    {id: 'a15d2d4c-4353-44a2-a796-66ca2a3924ca', host: 'system.example.com', name: 'System Domain'},
    school:    {id: '2489fefb-c278-491e-8597-1729079c2b6d', host: 'school.example.com', name: 'School Domain'},
    family:    {id: 'ae52ce11-6eb4-43ee-9fdf-5142a3df934f', host: 'family.example.com', name: 'Family Domain'},
    market:    {id: '0272e06c-1568-46c6-b973-e2f1dd5bf3cc', host: 'market.example.com', name: 'Market Domain'},
    police:    {id: '0aa47b8e-841f-45d5-95ba-3b0c56a702de', host: 'police.example.com', name: 'Police Domain'},
    policy:    {id: 'ff3a0149-1b90-4bf1-9925-07d92e75f4af', host: 'policy.example.com', name: 'Policy Domain'},
    office:    {id: 'ed9395a8-a707-45d4-baef-8121e7db894c', host: 'office.example.com', name: 'Office Domain'},
    person:    {id: 'b248cd26-d79c-490d-ab56-6ccedb7a85c0', host: 'person.example.com', name: ''},
    health:    {id: '12555fbd-6845-4562-bcc5-26a3d6142405', host: 'health.example.com', name: 'Health Domain'},
    mother:    {id: '172be5cc-d1fd-4fb3-9a3b-c3e9b1f73d32', host: 'mother.example.com', name: 'Mother Domain'},
    period:    {id: '990f0eb6-38f3-4afd-9f9b-528828d6b308', host: 'period.example.com', name: 'Period Domain'},
    father:    {id: 'd9aa42bf-c7ad-46b1-9529-53df86567b2c', host: 'father.example.com', name: 'Father Domain'},
    centre:    {id: '985c145b-0659-47c1-b672-c43cfe5047b1', host: 'centre.example.com', name: 'Centre Domain'},
    effect:    {id: '1f3ede50-8223-44d8-89ad-3fd4c57cd64e', host: 'effect.example.com', name: 'Effect Domain'},
    action:    {id: '7b3ee2e7-3fee-4563-9305-176c854809d3', host: 'action.example.com', name: 'Action Domain'},
    moment:    {id: '52cb5759-bbbf-4038-ab26-1db1e59b941b', host: 'moment.example.com', name: 'Moment Domain'},
    report:    {id: 'b594b045-884b-4c5d-a583-7389e7c8dc8e', host: 'report.example.com', name: ''},
    church:    {id: 'fd92d24f-0807-418a-87c4-e0f0d2b0b95d', host: 'church.example.com', name: ''},
    change:    {id: '5da851c3-fe90-4239-83af-3f5f32cf6a1f', host: 'change.example.com', name: ''},
    street:    {id: 'd4419e50-7229-4756-a61e-f582f6e04b17', host: 'street.example.com', name: ''},
    result:    {id: '56603812-4aa2-45b9-b4f4-a6295d3826d6', host: 'result.example.com', name: ''},
    reason:    {id: '557bfb71-e8c1-477f-83eb-12e26999ea5a', host: 'reason.example.com', name: ''},
    nature:    {id: '4b3d4a1b-934a-428b-83d5-1bd01ed8e68b', host: 'nature.example.com', name: ''},
    member:    {id: '428974f7-d881-4896-ba6e-52a9af16c612', host: 'member.example.com', name: ''},
    figure:    {id: 'a021b32b-6b09-4399-b8e6-d5ba20c8cd53', host: 'figure.example.com', name: ''},
    friend:    {id: '087b490c-6105-45fe-bbb7-c26af1779242', host: 'friend.example.com', name: ''},
    amount:    {id: 'b4a08821-11f6-456b-b5bf-b2b75e4e6784', host: 'amount.example.com', name: ''},
    series:    {id: 'd32b638c-30b4-43eb-9ee1-d332e2c74dbb', host: 'series.example.com', name: ''},
    future:    {id: '3659118b-a6d7-41ce-8218-e9976e2199d8', host: 'future.example.com', name: ''},
    labour:    {id: '1963fe6e-5a5d-48d0-aac6-0590de6a1949', host: 'labour.example.com', name: ''},
    letter:    {id: 'b750ca66-844b-434f-8fb9-6fff8ec7afe2', host: 'letter.example.com', name: ''},
    theory:    {id: '932410b5-2a90-48c5-af70-e6976a956118', host: 'theory.example.com', name: ''},
    growth:    {id: '6dfad19b-3785-4821-956d-25a877d0eb30', host: 'growth.example.com', name: ''},
    chance:    {id: '35338874-21d0-4a2a-9cf5-33b67532f676', host: 'chance.example.com', name: ''},
    record:    {id: 'b2aaeb80-b612-48cc-b780-6622fed2142e', host: 'record.example.com', name: ''},
    energy:    {id: '1b5a5b07-d5c2-45fc-bc0b-156c12916bf7', host: 'energy.example.com', name: ''},
    income:    {id: '9ec8644f-6517-452f-a5d2-18a5b5540210', host: 'income.example.com', name: ''},
    scheme:    {id: 'dacd724d-d0e8-4e0e-93d7-f032109efef3', host: 'scheme.example.com', name: ''},
    design:    {id: '2f7561be-ab77-4701-98be-01afcb874909', host: 'design.example.com', name: ''},
    choice:    {id: 'd9a07e2c-07b0-42cf-8113-6f00de1d9e49', host: 'choice.example.com', name: ''},
    couple:    {id: '2507e99e-7c3d-48b6-bb39-cf037383798d', host: 'couple.example.com', name: ''},
    county:    {id: '8d5ed092-602a-47bb-a357-48c932f5742a', host: 'county.example.com', name: ''},
    summer:    {id: '3de7fc93-496e-49bb-9bac-4b9769702ae4', host: 'summer.example.com', name: ''},
    colour:    {id: '42c5e874-8b44-4828-98d4-b1c438ceb1d6', host: 'colour.example.com', name: ''},
    season:    {id: '51e80b88-c7ae-4db1-8e13-f1995f58e2f4', host: 'season.example.com', name: ''},
    garden:    {id: '0c6bc25d-c792-481a-9110-90a178f49fb1', host: 'garden.example.com', name: ''},
    charge:    {id: '227b3e72-9cf6-457c-89cc-45a0ebd47378', host: 'charge.example.com', name: ''},
    advice:    {id: 'd102e1d1-42b1-4ee0-87ab-2d6ef7a0ae63', host: 'advice.example.com', name: ''},
    doctor:    {id: '26433311-0e35-48e2-9230-51bcaa688846', host: 'doctor.example.com', name: ''},
    extent:    {id: 'c549c5b3-1ddc-469d-9502-03127f85d160', host: 'extent.example.com', name: ''},
    window:    {id: '649a7711-7482-490f-a46b-2e98bd495707', host: 'window.example.com', name: ''},
    access:    {id: '79756dc6-4057-481f-a9c2-ae2fa6d9f844', host: 'access.example.com', name: ''},
    region:    {id: 'b5c36ab4-d91d-4674-890d-90897fd4ea91', host: 'region.example.com', name: ''},
    degree:    {id: '089b2d1b-8128-4b9e-a68b-6b83e1e1971d', host: 'degree.example.com', name: ''},
    return:    {id: '33021271-116d-4a5d-b41a-6e207928d3f5', host: 'return.example.com', name: 'Return Domain'},
    public:    {id: '722df68a-36d1-4faa-a99e-f12382c1ce99', host: 'public.example.com', name: 'Public Domain'},
    answer:    {id: 'f8304d03-6f56-4bd3-a4a1-59e723c32e4a', host: 'answer.example.com', name: 'Answer Domain'},
    leader:    {id: 'd9419dfd-d7d3-4921-8b68-24b00b39d2a6', host: 'leader.example.com', name: 'Leader Domain'},
    appeal:    {id: 'a2b7525f-91b9-443e-b6b4-0a6420acf667', host: 'appeal.example.com', name: 'Appeal Domain'},
    method:    {id: 'a4e861cf-c0aa-4467-9cd5-3bbf91405971', host: 'method.example.com', name: 'Method Domain'},
    source:    {id: 'ef1f2f2e-cc25-4419-859e-4aec353e6174', host: 'source.example.com', name: 'Source Domain'},
    oxford:    {id: '0227e633-393d-4f55-905b-fbe87955beef', host: 'oxford.example.com', name: 'Oxford Domain'},
    demand:    {id: 'a2b5a13f-4df4-4abc-8d0b-a861e9206586', host: 'demand.example.com', name: ''},
    sector:    {id: '3da5ed4c-af97-4fec-ad14-ef9b03b41c54', host: 'sector.example.com', name: ''},
    status:    {id: 'b65231bb-79a8-4103-9df0-6458884b0522', host: 'status.example.com', name: ''},
    safety:    {id: 'f4e6ef68-4285-4782-9969-896535d0cc8b', host: 'safety.example.com', name: ''},
    weight:    {id: '62762d75-d5af-4e9a-b71c-df5225000dbc', host: 'weight.example.com', name: ''},
    league:    {id: '2c5503e1-c2ef-4c8d-9c86-6e4631667ba5', host: 'league.example.com', name: 'League Domain'},
    budget:    {id: 'f0d0c1de-3b15-44d5-81b9-f59c20032f03', host: 'budget.example.com', name: 'Budget Domain'},
    review:    {id: 'b7ce595b-9a0b-49ee-83d1-6b74960e299b', host: 'review.example.com', name: 'Review Domain'},
    minute:    {id: '0ae1c3a3-4da3-4336-b65b-16dd4aff074e', host: 'minute.example.com', name: 'Minute Domain'},
    survey:    {id: '5e042fb2-93c6-4fd4-a3cb-744e0e835907', host: 'survey.example.com', name: 'Survey Domain'},
    speech:    {id: 'ffc8a2a3-8a68-46bf-a1b2-29dd1acd25ab', host: 'speech.example.com', name: 'Speech Domain'},
    effort:    {id: 'a1a80515-8e47-457f-85c0-8d6c049d24c8', host: 'effort.example.com', name: 'Effort Domain'},
    career:    {id: '64cd0315-6d9b-41dc-bf21-fa98e01f319a', host: 'career.example.com', name: 'Career Domain'},
    attack:    {id: 'db9910fc-a0a4-439d-b950-f0b69e883ecc', host: 'attack.example.com', name: ''},
    lethal:    {id: '4c9c04cf-8958-46f8-a1ea-0dc0ccd9a89f', host: 'lethal.example.com', name: ''},
    memory:    {id: '38b39174-2bb2-4e71-9148-2646eb55ff37', host: 'memory.example.com', name: ''},
    impact:    {id: '12a41d7a-a8bd-4e7a-847e-b90a8d22650a', host: 'impact.example.com', name: ''},
    forest:    {id: '15606012-e305-455f-9f7d-9d56c202e728', host: 'forest.example.com', name: ''},
    sister:    {id: 'ca59b914-c819-4502-a579-6b6b3d11cebc', host: 'sister.example.com', name: ''},
    winter:    {id: '6d739f9f-47a6-4059-a547-904da1fdd82d', host: 'winter.example.com', name: ''},
    corner:    {id: '864919d7-4812-4c70-8d79-4271b69abf71', host: 'corner.example.com', name: ''},
    damage:    {id: '5c81bcf6-9c70-426d-88b0-2dbc29c23848', host: 'damage.example.com', name: ''},
    credit:    {id: '9508e54e-f86f-4a57-a6c4-a2a0230c4f19', host: 'credit.example.com', name: ''},
    debate:    {id: '6d8528b8-82f8-4ad2-b5b6-efba86247890', host: 'debate.example.com', name: ''},
    supply:    {id: '3a2ff010-209f-4999-90ae-6bee2720afb7', host: 'supply.example.com', name: ''},
    museum:    {id: '82a9f5e7-5d40-4297-bee3-98671ece6ca8', host: 'museum.example.com', name: ''},
    animal:    {id: '0c542e15-8ceb-4543-bbe0-f199476b51db', host: 'animal.example.com', name: ''},
    island:    {id: '0a5ccffc-2eb4-4008-8db3-1fb4b177a59f', host: 'island.example.com', name: ''},
    relief:    {id: 'dce9e1a0-dfeb-497f-88bd-c0ce835aace4', host: 'relief.example.com', name: ''},
    target:    {id: 'c61500fb-0b7f-4bc2-8696-6149aa9c1097', host: 'target.example.com', name: ''},
    spirit:    {id: '6fcb3173-3a00-4aa5-8113-e39767b469a7', host: 'spirit.example.com', name: ''},
    coffee:    {id: 'affa7920-67cc-4f0e-bed5-8c58b1abee5f', host: 'coffee.example.com', name: ''},
    factor:    {id: '6c1be150-ea21-4ffd-b6ca-c18981d7d6eb', host: 'factor.example.com', name: ''},
    battle:    {id: 'c03b9b58-b2bb-4942-adca-168e7d812d8c', host: 'battle.example.com', name: ''},
    prison:    {id: '84a766a2-7154-4d7f-8307-20ec9df4fc68', host: 'prison.example.com', name: ''},
    bridge:    {id: '828f1362-37ae-4c8f-83e7-84801f84b6a8', host: 'bridge.example.com', name: ''},
};

/** Predefined **localhost** domain pages. */
export const DOMAIN_PAGES = {
    home:                 {id: '0ebb8a1b-12f6-421e-b1bb-75867ac480c7', path: '/',},
    comments:             {id: '0ebb8a1b-12f6-421e-b1bb-75867ac480c6', path: '/comments/',},
    nocomment:            {id: '0ebb8a1b-12f6-421e-b1bb-75867ac480c9', path: '/nocomment/',},
    readonly:             {id: '0ebb8a1b-12f6-421e-b1bb-75867ac480c8', path: '/readonly/',},
    longPath:             {id: '0ebb8a1b-12f6-421e-b1bb-75867ac480ca', path: '/page/with/a/very/long/path/that/will/definitely/have/to/be/wrapped/on/display/to/make/it/a/bit/usable.html?some_even_more_long_param=long_boring_value_3457290346493563584693847569723456987245869&foo=bar&buzz=238974592875469782&bux=whatever-28973423498765987249586729847569275469874578969234756938745697834569782349567824596879432756924578692874569234865'},
    double:               {id: '0ebb8a1b-12f6-421e-b1bb-75867ac480cb', path: '/double/'},
    dynamic:              {id: '0ebb8a1b-12f6-421e-b1bb-75867ac480cc', path: '/dynamic/'},
    darkMode:             {id: '0ebb8a1b-12f6-421e-b1bb-75867ac480cd', path: '/dark-mode/'},
    attrAutoInit:         {id: '0ebb8a1b-12f6-421e-b1bb-75867ac4a000', path: '/attr/auto-init/'},
    attrAutoNonIntSso:    {id: '0ebb8a1b-12f6-421e-b1bb-75867ac4a010', path: '/attr/auto-non-interactive-sso/'},
    attrNoFonts:          {id: '0ebb8a1b-12f6-421e-b1bb-75867ac4a020', path: '/attr/no-fonts/'},
    attrCssOverride:      {id: '0ebb8a1b-12f6-421e-b1bb-75867ac4a030', path: '/attr/css-override/'},
    attrCssOverrideFalse: {id: '0ebb8a1b-12f6-421e-b1bb-75867ac4a040', path: '/attr/css-override-false/'},
    attrPageId:           {id: '0ebb8a1b-12f6-421e-b1bb-75867ac4a050', path: '/different-page/123'},
    attrLiveUpdate:       {id: '0ebb8a1b-12f6-421e-b1bb-75867ac4a060', path: '/attr/live-update/'},
    attrMaxLevel:         {id: '0ebb8a1b-12f6-421e-b1bb-75867ac4a070', path: '/attr/max-level/'},
}

export class Util {

    /**
     * VisitOptions instance that stubs the clipboard write method so that:
     * 1. It works even in Chrome, which would normally first ask the user for permissions
     * 2. It allows to 'read' the copied text afterwards without actually involving the clipboard
     */
    static readonly stubWriteText: Partial<Cypress.VisitOptions> = {
        onBeforeLoad(win: Window): void {
            cy.stub(win.navigator.clipboard, 'writeText').as('writeText').resolves('');
        },
    };
}
