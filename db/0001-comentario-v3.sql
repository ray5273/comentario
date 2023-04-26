--======================================================================================================================
-- A start-over database migration, or, rather, an init script that (re)creates the entire database schema from the
-- legacy Commento database, if any.
--======================================================================================================================

-- Function that defines whether a migration of the legacy schema is required
create or replace function legacySchema() returns boolean as
    $$select exists(select from pg_tables where schemaname='public' and tablename='migrations')$$
    language sql
    immutable;

-- Pre-migration checks
do $$
declare
    migCount integer;
    newMig boolean;
begin
    -- Verify either all the original Commento's migration have been installed, or there's no legacy schema at all
    if legacySchema() then
        select count(*) into migCount from migrations;
        if migCount < 30 then
            raise exception
                E'\n\nNot all legacy database migrations have been installed: found %, expected 30. Please install and run Comentario 2.x first.\n\n',
                migCount;
        elseif migCount > 30 then
            raise exception
                E'\n\nToo many database migrations installed: found %, expected 30.\n\n',
                migCount;
        end if;

        -- No new migrations table may exist
        select exists(select from pg_tables where schemaname='public' and tablename='cm_migrations') into newMig;
        if newMig then
            raise exception E'\n\nTable cm_migrations already exists, which probably means legacy schema conversion has previously failed.\n\n';
        end if;
    end if;
end $$;

--======================================================================================================================
-- Initialise the new schema
--======================================================================================================================

------------------------------------------------------------------------------------------------------------------------
-- Extension to support UUID v4
------------------------------------------------------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

------------------------------------------------------------------------------------------------------------------------
-- Migrations
------------------------------------------------------------------------------------------------------------------------
create table if not exists cm_migrations (
    filename     varchar(255) primary key,                     -- Unique DB migration file name
    ts_installed timestamp default current_timestamp not null, -- Timestamp when the migration was installed
    md5          char(32)                            not null  -- MD5 checksum of the migration file content
);

------------------------------------------------------------------------------------------------------------------------
-- Known federated identity providers
------------------------------------------------------------------------------------------------------------------------
create table cm_identity_providers (
    id   varchar(32) primary key,     -- Unique provider ID, such as 'google'
    name varchar(63) not null unique, -- Unique display name, such as 'Google'
    icon varchar(32) not null         -- Name of the icon to use for the provider
);

-- Data
insert into cm_identity_providers(id, name, icon) values
    ('gitlab',  'GitLab',  'gitlab'),
    ('github',  'GitHub',  'github'),
    ('google',  'Google',  'google'),
    ('twitter', 'Twitter', 'twitter');

------------------------------------------------------------------------------------------------------------------------
-- Users
------------------------------------------------------------------------------------------------------------------------
create table cm_users (
    id             uuid primary key,                            -- Unique record ID
    email          varchar(254)                not null unique, -- Unique user email
    name           varchar(63)                 not null,        -- User's full name
    password_hash  varchar(100)                not null,        -- Password hash
    system_account boolean       default false not null,        -- Whether the user is a system account (cannot sign in)
    superuser      boolean       default false not null,        -- Whether the user is a "super user" (instance admin)
    confirmed      boolean                     not null,        -- Whether the user's email has been confirmed
    ts_confirmed   timestamp,                                   -- When the user's email has been confirmed
    ts_created     timestamp                   not null,        -- When the user was created
    user_created   uuid,                                        -- Reference to the user who created this one. null if the used signed up themselves
    signup_ip      varchar(15)   default ''    not null,        -- IP address the user signed up or was created from
    signup_country varchar(2)    default ''    not null,        -- 2-letter country code matching the signup_ip
    signup_url     varchar(2083) default ''    not null,        -- URL the user signed up on (only for commenter signup, empty for UI signup)
    banned         boolean       default false not null,        -- Whether the user is banned
    ts_banned      timestamp,                                   -- When the user was banned
    user_banned    uuid,                                        -- Reference to the user who banned this one
    remarks        text          default ''    not null,        -- Optional remarks for the user
    federated_idp  varchar(32),                                 -- Optional ID of the federated identity provider used for authentication. If empty, it's a local user
    federated_id   varchar(255),                                -- User ID as reported by the federated identity provider (only when federated_idp is set)
    avatar         bytea,                                       -- Optional user's avatar image
    website_url    varchar(2083)                                -- Optional user's website URL
);

-- Constraints
alter table cm_users add constraint fk_users_user_created  foreign key (user_created)  references cm_users(id) on delete set null;
alter table cm_users add constraint fk_users_user_banned   foreign key (user_banned)   references cm_users(id) on delete set null;
alter table cm_users add constraint fk_users_federated_idp foreign key (federated_idp) references cm_identity_providers(id) on delete restrict;

-- Data
insert into cm_users(id, email, name, password_hash, system_account, confirmed, ts_created)
    -- 'Anonymous' user
    values('00000000-0000-0000-0000-000000000000'::uuid, '', 'Anonymous', '', true, false, current_timestamp);

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
    ua_device          varchar(63)  default '' not null  -- User's device type
);

-- Constraints
alter table cm_user_sessions add constraint fk_user_sessions_user_id foreign key (user_id) references cm_users(id) on delete cascade;

------------------------------------------------------------------------------------------------------------------------
-- Tokens
------------------------------------------------------------------------------------------------------------------------
create table cm_tokens (
    value      char(64) primary key, -- Token value, a random byte sequence
    user_id    uuid not null,        -- Reference to the user owning the token
    scope      varchar(32),          -- Token's scope
    ts_expires timestamp,            -- When the token expires
    multiuse   boolean               -- Whether the token is to be kept until expired; if false, the token gets deleted after first use
);

-- Constraints
alter table cm_tokens add constraint fk_tokens_user_id foreign key (user_id) references cm_users(id) on delete cascade;

------------------------------------------------------------------------------------------------------------------------
-- Domains
------------------------------------------------------------------------------------------------------------------------

create table cm_domains (
    id                uuid primary key,                      -- Unique record ID
    name              varchar(255)          not null,        -- Domain display name
    host              varchar(259)          not null unique, -- Domain host
    ts_created        timestamp             not null,        -- When the domain was created
    is_readonly       boolean default false not null,        -- Whether the domain is readonly (no new comments are allowed)
    auth_anonymous    boolean default false not null,        -- Whether anonymous comments are allowed
    auth_local        boolean default false not null,        -- Whether local authentication is allowed
    auth_sso          boolean default false not null,        -- Whether SSO authentication is allowed
    sso_url           varchar(2083),                         -- SSO provider URL
    sso_secret        char(64),                              -- SSO secret
    moderation_policy varchar(16)           not null,        -- Moderation policy for domain: 'none', 'anonymous', 'all'
    mod_notify_policy varchar(16)           not null,        -- Moderator notification policy for domain: 'none', 'pending', 'all'
    default_sort      char(2)               not null,        -- Default comment sorting for domain. 1st letter: s = score, t = timestamp; 2nd letter: a = asc, d = desc
    count_comments    integer default 0     not null,        -- Total number of comments
    count_views       integer default 0     not null         -- Total number of views
);

-- Links between domains and users
create table cm_domains_users (
    domain_id        uuid                  not null, -- Reference to the domain
    user_id          uuid                  not null, -- Reference to the user
    is_owner         boolean default false not null, -- Whether the user is an owner of the domain (assumes is_moderator and is_commenter)
    is_moderator     boolean default false not null, -- Whether the user is a moderator of the domain (assumes is_commenter)
    is_commenter     boolean default false not null, -- Whether the user is a commenter of the domain (if false, the user is readonly on the domain)
    notify_replies   boolean default true  not null, -- Whether the user is to be notified about replies to their comments
    notify_moderator boolean default true  not null  -- Whether the user is to receive moderator notifications (only when is_moderator is true)
);

-- Constraints
alter table cm_domains_users add primary key (domain_id, user_id);
alter table cm_domains_users add constraint fk_domains_users_domain_id foreign key (domain_id) references cm_domains(id) on delete cascade;
alter table cm_domains_users add constraint fk_domains_users_user_id   foreign key (user_id)   references cm_users(id)   on delete cascade;

-- Links between domains and identity providers, specifying which IdPs are allowed on the domain
create table cm_domains_idps (
    domain_id uuid        not null, -- Reference to the domain
    idp_id    varchar(32) not null  -- Reference to the identity provider
);

-- Constraints
alter table cm_domains_idps add constraint fk_domains_idps_domain_id foreign key (domain_id) references cm_domains(id)            on delete cascade;
alter table cm_domains_idps add constraint fk_domains_idps_idp_id    foreign key (idp_id)    references cm_identity_providers(id) on delete cascade;

------------------------------------------------------------------------------------------------------------------------
-- Domain pages
------------------------------------------------------------------------------------------------------------------------

create table cm_domain_pages (
    id             uuid primary key,                    -- Unique record ID
    domain_id      uuid                       not null, -- Reference to the domain
    path           varchar(2083)              not null, -- Page path
    title          varchar(100) default ''    not null, -- Page title
    is_readonly    boolean      default false not null, -- Whether the page is readonly (no new comments are allowed)
    count_comments integer      default 0     not null, -- Total number of comments
    count_views    integer      default 0     not null  -- Total number of views
);

-- Constraints
alter table cm_domain_pages add constraint fk_domain_pages_domain_id      foreign key (domain_id) references cm_domains(id) on delete cascade;
alter table cm_domain_pages add constraint uk_domain_pages_domain_id_path unique (domain_id, path);

--======================================================================================================================
-- Migrate the legacy schema
--======================================================================================================================

do $$
begin
    if legacySchema() then
        -- Create a ownerhex mapping table
        create temporary table temp_ownerhex_map(ownerhex varchar(64) primary key, id uuid not null unique);
        insert into temp_ownerhex_map(ownerhex, id) select ownerhex, gen_random_uuid() from owners;

        -- Create a commenterhex mapping table
        create temporary table temp_commenterhex_map(commenterhex varchar(64) primary key, id uuid not null unique);
        insert into temp_commenterhex_map(commenterhex, id) select commenterhex, gen_random_uuid() from commenters;

        -- Create a domain mapping table
        create temporary table temp_domain_map(domain varchar(259) primary key, id uuid not null unique);
        insert into temp_domain_map(domain, id) select domain, gen_random_uuid() from domains;

        -- Migrate owners
        insert into cm_users(id, email, name, password_hash, confirmed, ts_confirmed, ts_created, remarks)
            select m.id, o.email, o.name, o.passwordhash, o.confirmedemail='true', o.joindate, o.joindate, 'Migrated from Commento, ownerhex=' || o.ownerhex
                from owners o
                join temp_ownerhex_map m on m.ownerhex=o.ownerhex;

        -- Migrate commenters
        insert into cm_users(id, email, name, password_hash, confirmed, ts_confirmed, ts_created, remarks, federated_idp, website_url)
            select
                    m.id, c.email, c.name, c.passwordhash, true, c.joindate, c.joindate,
                    'Migrated from Commento, commenterhex=' || c.commenterhex,
                    case when c.provider='commento' then null else c.provider end,
                    case when c.link='undefined' then null else c.link end
                from commenters c
                join temp_commenterhex_map m on m.commenterhex=c.commenterhex
                -- Prevent adding commenter for an already registered owner user
                where not exists(select 1 from cm_users u where u.email=c.email);

        -- Migrate domains
        insert into cm_domains(
                id, name, host, ts_created, is_readonly, auth_anonymous, auth_local, auth_sso, sso_url, sso_secret, moderation_policy, mod_notify_policy, default_sort)
            select
                    m.id, d.name, d.domain, d.creationdate, d.state='frozen', !d.requireidentification, d.commentoprovider, d.ssoprovider, d.ssourl, d.ssosecret,
                    case
                        when d.requiremoderation then 'all'
                        when d.moderateallanonymous then 'anonymous'
                        else 'none'
                    end,
                    case
                        when d.emailnotificationpolicy='all' then 'all'
                        when d.emailnotificationpolicy='none' then 'none'
                        else 'pending'
                    end,
                    case
                        when d.defaultsortpolicy='score-desc' then 'sd'
                        when d.defaultsortpolicy='creationdate-desc' then 'td'
                        else 'ta'
                    end
                from domains d
                join temp_domain_map m on m.domain=d.domain;

        -- Migrate domain owners
        insert into cm_domains_users(domain_id, user_id, is_owner, is_moderator, is_commenter, notify_replies, notify_moderator)
            select dm.id, om.id, true, true, true, coalesce(e.sendreplynotifications, false), coalesce(e.sendmoderatornotifications, false)
                from domains d
                join owners o on o.ownerhex=d.ownerhex
                join temp_ownerhex_map om on om.ownerhex=o.ownerhex
                join temp_domain_map dm on dm.domain=d.domain
                left join emails e on e.email=o.email;

        -- Migrate domain moderators
        insert into cm_domains_users(domain_id, user_id, is_owner, is_moderator, is_commenter, notify_replies, notify_moderator)
            select dm.id, u.id, false, true, true, coalesce(e.sendreplynotifications, false), coalesce(e.sendmoderatornotifications, false)
                from moderators mod
                join cm_users u on u.email=mod.email
                join temp_domain_map dm on dm.domain=mod.domain
                left join emails e on e.email=o.email
                -- Exclude already migrated owners
                where not exists(select 1 from cm_users xu where xu.email=mod.email);

        -- Migrate domain commenters
        insert into cm_domains_users(domain_id, user_id, is_owner, is_moderator, is_commenter, notify_replies, notify_moderator)
            select dm.id, u.id, false, false, true, coalesce(e.sendreplynotifications, false), coalesce(e.sendmoderatornotifications, false)
                from (select distinct commenterhex, domain from comments) c
                join temp_commenterhex_map cm on cm.commenterhex=c.commenterhex
                join cm_users u on u.id=cm.id
                join temp_domain_map dm on dm.domain=c.domain
                left join emails e on e.email=o.email
                -- Exclude already migrated owners/moderators
                where not exists(select 1 from cm_domains_users xdu where xdu.domain_id=dm.id and xdu.user_id=u.id);

        -- Migrate pages
        insert into cm_domain_pages(id, domain_id, path, title, is_readonly, count_comments)
            select gen_random_uuid(), m.id, p.path, p.title, p.islocked, p.commentcount
                from pages p
                join temp_domain_map m on m.domain=p.domain;


        -- TODO update domains.count_comments, count_views
        -- TODO update cm_domain_pages.count_views
        -- TODO migrate sticky comments

    end if;
end $$;

--======================================================================================================================
-- Cleanup the legacy schema
--======================================================================================================================

do $$
begin
    return; -- TODO disable for now

    if legacySchema() then
        -- Drop all tables
        drop table migrations        cascade;
        drop table owners            cascade;
        drop table ownersessions     cascade;
        drop table ownerconfirmhexes cascade;
        drop table resethexes        cascade;
        drop table domains           cascade;
        drop table moderators        cascade;
        drop table commenters        cascade;
        drop table commentersessions cascade;
        drop table comments          cascade;
        drop table votes             cascade;
        drop table views             cascade;
        drop table pages             cascade;
        drop table config            cascade;
        drop table exports           cascade;
        drop table emails            cascade;
        drop table ssotokens         cascade;

        -- Drop types
        drop type sortpolicy;

        -- Drop functions
        drop function commentsinserttriggerfunction;
        drop function viewsinserttriggerfunction;
        drop function votesinserttriggerfunction;
        drop function votesupdatetriggerfunction;
    end if;
end $$;

-- Cleanup this migration's stuff
drop function legacySchema;
