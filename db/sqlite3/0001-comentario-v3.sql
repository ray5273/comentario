--======================================================================================================================
-- An init script that creates the entire database schema from scratch
--======================================================================================================================

------------------------------------------------------------------------------------------------------------------------
-- Migrations
------------------------------------------------------------------------------------------------------------------------
create table if not exists cm_migrations (
    filename     varchar(255) primary key,                     -- Unique DB migration file name
    ts_installed timestamp default current_timestamp not null, -- Timestamp when the migration was installed
    md5          char(32)                            not null  -- MD5 checksum of the migration file content
);

create table if not exists cm_migration_log (
    filename     varchar(255)                        not null, -- DB migration file name
    ts_created   timestamp default current_timestamp not null, -- Timestamp when the record was created
    md5_expected char(32)                            not null, -- Expected MD5 checksum of the migration file content
    md5_actual   char(32)                            not null, -- Actual MD5 checksum of the migration file content
    status       varchar(20)                         not null, -- Migration status: 'installed', 'reinstalled', 'failed', 'skipped'
    error_text   text                                          -- Optional error text is is_ok is false
);

------------------------------------------------------------------------------------------------------------------------
-- Users
------------------------------------------------------------------------------------------------------------------------
create table cm_users (
    id             uuid primary key,                            -- Unique record ID
    email          varchar(254)                not null unique, -- Unique user email
    name           varchar(63)                 not null,        -- User's full name
    lang_id        varchar(5)    default 'en'  not null,        -- User's interface language ID
    password_hash  varchar(100)                not null,        -- Password hash
    system_account boolean       default false not null,        -- Whether the user is a system account (cannot sign in)
    is_superuser   boolean       default false not null,        -- Whether the user is a "super user" (instance admin)
    confirmed      boolean                     not null,        -- Whether the user's email has been confirmed
    ts_confirmed   timestamp,                                   -- When the user's email has been confirmed
    ts_created     timestamp                   not null,        -- When the user was created
    user_created   uuid,                                        -- Reference to the user who created this one. null if the used signed up themselves
    signup_ip      varchar(15)   default ''    not null,        -- IP address the user signed up or was created from
    signup_country varchar(2)    default ''    not null,        -- 2-letter country code matching the signup_ip
    signup_host    varchar(259)  default ''    not null,        -- Host the user signed up on (only for commenter signup, empty for UI signup)
    banned         boolean       default false not null,        -- Whether the user is banned
    ts_banned      timestamp,                                   -- When the user was banned
    user_banned    uuid,                                        -- Reference to the user who banned this one
    remarks        text          default ''    not null,        -- Optional remarks for the user
    federated_idp  varchar(32),                                 -- Optional ID of the federated identity provider used for authentication (the set of available IDs is defined in the backend). If empty and federated_sso is false, it's a local user
    federated_sso  boolean       default false not null,        -- Whether the user is authenticated via SSO
    federated_id   varchar(255)  default ''    not null,        -- User ID as reported by the federated identity provider (only when federated_idp/federated_sso is set)
    website_url    varchar(2083) default ''    not null,        -- Optional user's website URL
    secret_token   uuid                        not null,        -- User's secret token, for example, for unsubscribing from notifications
    -- Constraints
    constraint fk_users_user_created foreign key (user_created) references cm_users(id) on delete set null,
    constraint fk_users_user_banned  foreign key (user_banned)  references cm_users(id) on delete set null
);

-- Data
insert into cm_users(id, email, name, password_hash, system_account, confirmed, ts_created, secret_token)
    -- 'Anonymous' user
    values(
        '00000000-0000-0000-0000-000000000000', '', 'Anonymous', '', true, false, current_timestamp,
        lower(hex(randomblob(4))) || '-' ||
            lower(hex(randomblob(2))) || '-4' ||
            substr(lower(hex(randomblob(2))),2) || '-' ||
            substr('89ab',abs(random()) % 4 + 1, 1) ||
            substr(lower(hex(randomblob(2))),2) || '-' ||
            lower(hex(randomblob(6))));

------------------------------------------------------------------------------------------------------------------------
-- Dynamic instance configuration
------------------------------------------------------------------------------------------------------------------------
create table cm_configuration (
    key          varchar(255) primary key,                        -- Unique configuration item key
    value        varchar(255) default ''                not null, -- Item value
    ts_updated   timestamp    default current_timestamp not null, -- Timestamp when the item was last updated in the database
    user_updated uuid,                                            -- Reference to the user who last updated the item in the database
    -- Constraints
    constraint fk_configuration_user_updated foreign key (user_updated) references cm_users (id) on delete set null
);

------------------------------------------------------------------------------------------------------------------------
-- User attributes
------------------------------------------------------------------------------------------------------------------------
create table cm_user_attrs (
    user_id    uuid,                                         -- Reference to the user and the primary key
    key        varchar(255),                                 -- Attribute key
    value      varchar(255)                        not null, -- Attribute value
    ts_updated timestamp default current_timestamp not null, -- When the record was last updated
    -- Constraints
    primary key (user_id, key),
    constraint fk_user_attrs_user_id foreign key (user_id) references cm_users(id) on delete cascade
);

------------------------------------------------------------------------------------------------------------------------
-- User avatars
------------------------------------------------------------------------------------------------------------------------
create table cm_user_avatars (
    user_id    uuid primary key,   -- Reference to the user and the primary key
    ts_updated timestamp not null, -- When the record was last updated
    is_custom  boolean   not null, -- Whether the user has customised their avatar, meaning it shouldn't be re-fetched from the IdP
    avatar_s   bytea     not null, -- Small avatar image (16x16)
    avatar_m   bytea     not null, -- Medium-sized avatar image (32x32)
    avatar_l   bytea     not null, -- Large avatar image (128x128)
    -- Constraints
    constraint fk_user_avatars_user_id foreign key (user_id) references cm_users(id) on delete cascade
);

------------------------------------------------------------------------------------------------------------------------
-- User sessions
------------------------------------------------------------------------------------------------------------------------
create table cm_user_sessions (
    id                 uuid primary key,                 -- Unique record ID
    user_id            uuid                    not null, -- Reference to the user who owns the session
    ts_created         timestamp               not null, -- When the session was created
    ts_expires         timestamp               not null, -- When the session expires
    host               varchar(259) default '' not null, -- Host the session was created on (only for commenter login, empty for UI login)
    proto              varchar(32)             not null, -- The protocol version, like "HTTP/1.0"
    ip                 varchar(15)  default '' not null, -- IP address the session was created from
    country            varchar(2)   default '' not null, -- 2-letter country code matching the ip
    ua_browser_name    varchar(63)  default '' not null, -- Name of the user's browser
    ua_browser_version varchar(63)  default '' not null, -- Version of the user's browser
    ua_os_name         varchar(63)  default '' not null, -- Name of the user's OS
    ua_os_version      varchar(63)  default '' not null, -- Version of the user's OS
    ua_device          varchar(63)  default '' not null, -- User's device type
    -- Constraints
    constraint fk_user_sessions_user_id foreign key (user_id) references cm_users(id) on delete cascade
);

------------------------------------------------------------------------------------------------------------------------
-- Tokens
------------------------------------------------------------------------------------------------------------------------

create table cm_tokens (
    value      char(64) primary key, -- Token value, a random byte sequence
    user_id    uuid        not null, -- Reference to the user owning the token
    scope      varchar(32) not null, -- Token's scope
    ts_expires timestamp   not null, -- When the token expires
    multiuse   boolean     not null, -- Whether the token is to be kept until expired; if false, the token gets deleted after first use
    -- Constraints
    constraint fk_tokens_user_id foreign key (user_id) references cm_users(id) on delete cascade
);

------------------------------------------------------------------------------------------------------------------------
-- Auth sessions
------------------------------------------------------------------------------------------------------------------------

create table cm_auth_sessions (
    id          uuid primary key,             -- Unique record ID
    token_value char(64)     not null unique, -- Reference to the anonymous token authentication was initiated with. Unique because a token may be used at most for one auth session
    data        text         not null,        -- Opaque session data
    host        varchar(259) not null,        -- Optional source page host
    ts_created  timestamp    not null,        -- When the session was created
    ts_expires  timestamp    not null,        -- When the session expires
    -- Constraints
    constraint fk_auth_sessions_token_value foreign key (token_value) references cm_tokens(value) on delete cascade
);

------------------------------------------------------------------------------------------------------------------------
-- Domains
------------------------------------------------------------------------------------------------------------------------

create table cm_domains (
    id                 uuid primary key,                            -- Unique record ID
    name               varchar(255)                not null,        -- Domain display name
    host               varchar(259)                not null unique, -- Domain host
    ts_created         timestamp                   not null,        -- When the record was created
    is_https           boolean       default false not null,        -- Whether HTTPS should be used to resolve URLs on this domain (as opposed to HTTP)
    is_readonly        boolean       default false not null,        -- Whether the domain is readonly (no new comments are allowed)
    auth_anonymous     boolean       default false not null,        -- Whether anonymous comments are allowed
    auth_local         boolean       default false not null,        -- Whether local authentication is allowed
    auth_sso           boolean       default false not null,        -- Whether SSO authentication is allowed
    sso_url            varchar(2083) default ''    not null,        -- SSO provider URL
    sso_secret         char(64),                                    -- SSO secret
    sso_noninteractive boolean       default false not null,        -- Whether to use a non-interactive SSO login
    mod_anonymous      boolean       default true  not null,        -- Whether all anonymous comments are to be approved by a moderator
    mod_authenticated  boolean       default false not null,        -- Whether all non-anonymous comments are to be approved by a moderator
    mod_num_comments   integer       default 0     not null,        -- Number of first comments by user on this domain that require a moderator approval
    mod_user_age_days  integer       default 0     not null,        -- Number of first days since user has registered on this domain to require a moderator approval on their comments
    mod_links          boolean       default false not null,        -- Whether all comments containing a link are to be approved by a moderator
    mod_images         boolean       default false not null,        -- Whether all comments containing an image are to be approved by a moderator
    mod_notify_policy  varchar(16)                 not null,        -- Moderator notification policy for domain: 'none', 'pending', 'all'
    default_sort       char(2)                     not null,        -- Default comment sorting for domain. 1st letter: s = score, t = timestamp; 2nd letter: a = asc, d = desc
    count_comments     integer       default 0     not null,        -- Total number of comments
    count_views        integer       default 0     not null         -- Total number of views
);

-- Links between domains and users
create table cm_domains_users (
    domain_id        uuid                  not null, -- Reference to the domain
    user_id          uuid                  not null, -- Reference to the user
    is_owner         boolean default false not null, -- Whether the user is an owner of the domain (assumes is_moderator and is_commenter)
    is_moderator     boolean default false not null, -- Whether the user is a moderator of the domain (assumes is_commenter)
    is_commenter     boolean default false not null, -- Whether the user is a commenter of the domain (if false, the user is readonly on the domain)
    notify_replies   boolean default true  not null, -- Whether the user is to be notified about replies to their comments
    notify_moderator boolean default true  not null, -- Whether the user is to receive moderator notifications (only when is_moderator is true)
    ts_created       timestamp             not null, -- When the record was created
    -- Constraints
    primary key (domain_id, user_id),
    constraint fk_domains_users_domain_id foreign key (domain_id) references cm_domains(id) on delete cascade,
    constraint fk_domains_users_user_id   foreign key (user_id)   references cm_users(id)   on delete cascade
);

-- Links between domains and federated identity providers, specifying which IdPs are allowed on the domain
create table cm_domains_idps (
    domain_id  uuid        not null, -- Reference to the domain
    fed_idp_id varchar(32) not null, -- Reference to the identity provider (the set of available IDs is defined in the backend)
    -- Constraints
    constraint fk_domains_idps_domain_id foreign key (domain_id) references cm_domains(id) on delete cascade
);

-- Links between domains and extensions
create table cm_domains_extensions (
    domain_id    uuid                     not null, -- Reference to the domain
    extension_id varchar(32)              not null, -- Extension ID (the set of available IDs is defined in the backend)
    config       varchar(4096) default '' not null, -- Extension configuration parameters
    -- Constraints
    constraint fk_domains_extensions_domain_id foreign key (domain_id) references cm_domains(id) on delete cascade
);

------------------------------------------------------------------------------------------------------------------------
-- Domain pages
------------------------------------------------------------------------------------------------------------------------

create table cm_domain_pages (
    id             uuid primary key,                    -- Unique record ID
    domain_id      uuid                       not null, -- Reference to the domain
    path           varchar(2083)              not null, -- Page path
    title          varchar(100) default ''    not null, -- Page title
    is_readonly    boolean      default false not null, -- Whether the page is readonly (no new comments are allowed)
    ts_created     timestamp                  not null, -- When the record was created
    count_comments integer      default 0     not null, -- Total number of comments
    count_views    integer      default 0     not null, -- Total number of views
    -- Constraints
    constraint fk_domain_pages_domain_id      foreign key (domain_id) references cm_domains(id) on delete cascade,
    constraint uk_domain_pages_domain_id_path unique (domain_id, path)
);

-- Indices
create index idx_domain_pages_domain_id on cm_domain_pages(domain_id);

------------------------------------------------------------------------------------------------------------------------
-- Domain page views
------------------------------------------------------------------------------------------------------------------------

create table cm_domain_page_views (
    page_id            uuid                   not null, -- Reference to the page
    ts_created         timestamp              not null, -- When the record was created
    proto              varchar(32) default '' not null, -- The protocol version, like "HTTP/1.0"
    ip                 varchar(15) default '' not null, -- IP address the session was created from
    country            varchar(2)  default '' not null, -- 2-letter country code matching the ip
    ua_browser_name    varchar(63) default '' not null, -- Name of the user's browser
    ua_browser_version varchar(63) default '' not null, -- Version of the user's browser
    ua_os_name         varchar(63) default '' not null, -- Name of the user's OS
    ua_os_version      varchar(63) default '' not null, -- Version of the user's OS
    ua_device          varchar(63) default '' not null, -- User's device type
    -- Constraints
    constraint fk_domain_page_views_page_id foreign key (page_id) references cm_domain_pages(id) on delete cascade
);

-- Indices
create index idx_domain_page_views_page_id    on cm_domain_page_views(page_id);
create index idx_domain_page_views_ts_created on cm_domain_page_views(ts_created);

------------------------------------------------------------------------------------------------------------------------
-- Comments
------------------------------------------------------------------------------------------------------------------------

create table cm_comments (
    id             uuid primary key,                    -- Unique record ID
    parent_id      uuid,                                -- Parent record ID, null if it's a root comment on the page
    page_id        uuid                       not null, -- Reference to the page
    markdown       text                       not null, -- Comment text in markdown
    html           text                       not null, -- Rendered comment text in HTML
    score          integer      default 0     not null, -- Comment score
    is_sticky      boolean      default false not null, -- Whether the comment is sticky (attached to the top of page)
    is_approved    boolean      default false not null, -- Whether the comment is approved and can be seen by everyone
    is_pending     boolean      default false not null, -- Whether the comment is pending approval
    is_deleted     boolean      default false not null, -- Whether the comment is marked as deleted
    ts_created     timestamp                  not null, -- When the comment was created
    ts_moderated   timestamp,                           -- When a moderation action has last been applied to the comment
    ts_deleted     timestamp,                           -- When the comment was marked as deleted
    user_created   uuid,                                -- Reference to the user who created the comment
    user_moderated uuid,                                -- Reference to the user who last moderated the comment
    user_deleted   uuid,                                -- Reference to the user who deleted the comment
    pending_reason varchar(255) default ''    not null, -- Reason for the pending state of the comment
    -- Constraints
    constraint fk_comments_parent_id      foreign key (parent_id)      references cm_comments(id)     on delete cascade,
    constraint fk_comments_page_id        foreign key (page_id)        references cm_domain_pages(id) on delete cascade,
    constraint fk_comments_user_created   foreign key (user_created)   references cm_users(id)        on delete set null,
    constraint fk_comments_user_moderated foreign key (user_moderated) references cm_users(id)        on delete set null,
    constraint fk_comments_user_deleted   foreign key (user_deleted)   references cm_users(id)        on delete set null
);

-- Indices
create index idx_comments_page_id    on cm_comments(page_id);
create index idx_comments_ts_created on cm_comments(ts_created);

------------------------------------------------------------------------------------------------------------------------
-- Comment votes
------------------------------------------------------------------------------------------------------------------------

create table cm_comment_votes (
    comment_id uuid      not null, -- Reference to the comment
    user_id    uuid      not null, -- Reference to the user
    negative   boolean   not null, -- Whether the vote is negative (true) or positive (false)
    ts_voted   timestamp not null, -- When the vote was created or updated
    -- Constraints
    constraint uk_comment_votes_comment_id_user_id unique (comment_id, user_id),
    constraint fk_comment_votes_comment_id         foreign key (comment_id) references cm_comments(id) on delete cascade,
    constraint fk_comment_votes_user_id            foreign key (user_id)    references cm_users(id)    on delete cascade
);

-- Indices
create index idx_comment_votes_comment_id on cm_comment_votes(comment_id);
create index idx_comment_votes_user_id    on cm_comment_votes(user_id);
