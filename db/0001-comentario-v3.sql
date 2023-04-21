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
    id             uuid primary key,                          -- Unique user ID
    email          varchar(254)              not null unique, -- Unique user email
    name           varchar(63)               not null,        -- User's full name
    password_hash  varchar(100)              not null,        -- Password hash
    system_account boolean     default false not null,        -- Whether the user is a system account (cannot sign in)
    superuser      boolean     default false not null,        -- Whether the user is a "super user" (instance admin)
    confirmed      boolean                   not null,        -- Whether the user's email has been confirmed
    ts_confirmed   timestamp,                                 -- When the user's email has been confirmed
    ts_created     timestamp                 not null,        -- When the user was created
    user_created   uuid,                                      -- Reference to the user who created this one. null if the used signed up themselves
    signup_ip      varchar(15) default ''    not null,        -- IP address the user signed up or was created from
    signup_country varchar(2)  default ''    not null,        -- 2-letter country code matching the signup_ip
    banned         boolean     default false not null,        -- Whether the user is banned
    ts_banned      timestamp,                                 -- When the user was banned
    user_banned    uuid,                                      -- Reference to the user who banned this one
    remarks        text        default ''    not null,        -- Optional remarks for the user
    federated_idp  varchar(32),                               -- Optional ID of the federated identity provider used for authentication. If empty, it's a local user
    federated_id   varchar(255),                              -- User ID as reported by the federated identity provider (only when federated_idp is set)
    avatar         bytea,                                     -- Optional user's avatar image
    website_url    varchar(2083)                              -- Optional user's website URL
);

-- Foreign keys
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
    id                 uuid primary key,                 -- Unique session ID
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

-- Foreign keys
alter table cm_user_sessions add constraint fk_user_sessions_user_id foreign key (user_id) references cm_users(id) on delete cascade;

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
