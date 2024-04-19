------------------------------------------------------------------------------------------------------------------------
-- Create domain configuration table
------------------------------------------------------------------------------------------------------------------------
create table cm_domain_configuration (
    domain_id    uuid                                   not null, -- Reference to the domain
    key          varchar(255)                           not null, -- Configuration item key
    value        varchar(255) default ''                not null, -- Item value
    ts_updated   timestamp    default current_timestamp not null, -- Timestamp when the item was last updated in the database
    user_updated uuid,                                            -- Reference to the user who last updated the item in the database
    primary key (domain_id, key),
    constraint fk_domain_configuration_domain_id    foreign key (domain_id)    references cm_domains(id) on delete cascade,
    constraint fk_domain_configuration_user_updated foreign key (user_updated) references cm_users(id)   on delete set null
);

------------------------------------------------------------------------------------------------------------------------
-- Rename parameters
------------------------------------------------------------------------------------------------------------------------
-- Make "useGravatar" an instance-wide setting (as users are instance-wide entities)
update cm_configuration set key = 'integrations.useGravatar' where key = 'domain.defaults.useGravatar';
-- Conversely, make Markdown options domain-level settings
update cm_configuration set key = 'domain.defaults.markdown.images.enabled' where key = 'markdown.images.enabled';
update cm_configuration set key = 'domain.defaults.markdown.links.enabled'  where key = 'markdown.links.enabled';
update cm_configuration set key = 'domain.defaults.markdown.tables.enabled' where key = 'markdown.tables.enabled';

------------------------------------------------------------------------------------------------------------------------
-- Add comment fields
------------------------------------------------------------------------------------------------------------------------
alter table cm_comments add column ts_edited      timestamp;                                       -- When the comment text was last edited. null if it's never been edited
alter table cm_comments add column user_edited    uuid references cm_users(id) on delete set null; -- Reference to the user who last edited the comment
alter table cm_comments add column author_name    varchar(63) default '' not null;                 -- Name of the author, in case the user isn't registered
alter table cm_comments add column author_ip      varchar(15) default '' not null;                 -- IP address of the author
alter table cm_comments add column author_country varchar(2)  default '' not null;                 -- 2-letter country code matching the author_ip

------------------------------------------------------------------------------------------------------------------------
-- Add login audit columns for users
------------------------------------------------------------------------------------------------------------------------
alter table cm_users add column ts_password_change    timestamp default '1970-01-01T00:00:00Z' not null; -- When the user's password was last changed
alter table cm_users add column ts_last_login         timestamp;                                         -- When the user last logged in successfully. null if user never logged in
alter table cm_users add column ts_last_failed_login  timestamp;                                         -- When the user last failed to log in due to wrong credentials. null if there was never a failed login
alter table cm_users add column failed_login_attempts integer default 0 not null;                        -- Number of failed login attempts
alter table cm_users add column is_locked             boolean default false not null;                    -- Whether the user is locked out
alter table cm_users add column ts_locked             timestamp;                                         -- When the user was locked. null if the user isn't locked

------------------------------------------------------------------------------------------------------------------------
-- Enlarge IP address fields to accommodate IPv6. Recreate the tables since SQLite has no ALTER COLUMN statement
------------------------------------------------------------------------------------------------------------------------
-- cm_user_sessions
create temporary table temp_cm_user_sessions as
    select * from cm_user_sessions;
drop table cm_user_sessions;
create table cm_user_sessions (
    id                 uuid primary key,                 -- Unique record ID
    user_id            uuid                    not null, -- Reference to the user who owns the session
    ts_created         timestamp               not null, -- When the session was created
    ts_expires         timestamp               not null, -- When the session expires
    host               varchar(259) default '' not null, -- Host the session was created on (only for commenter login, empty for UI login)
    proto              varchar(32)             not null, -- The protocol version, like "HTTP/1.0"
    ip                 varchar(39)  default '' not null, -- IP address the session was created from
    country            varchar(2)   default '' not null, -- 2-letter country code matching the ip
    ua_browser_name    varchar(63)  default '' not null, -- Name of the user's browser
    ua_browser_version varchar(63)  default '' not null, -- Version of the user's browser
    ua_os_name         varchar(63)  default '' not null, -- Name of the user's OS
    ua_os_version      varchar(63)  default '' not null, -- Version of the user's OS
    ua_device          varchar(63)  default '' not null, -- User's device type
    -- Constraints
    constraint fk_user_sessions_user_id foreign key (user_id) references cm_users(id) on delete cascade
);
insert into cm_user_sessions(id, user_id, ts_created, ts_expires, host, proto, ip, country, ua_browser_name, ua_browser_version, ua_os_name, ua_os_version, ua_device)
    select id, user_id, ts_created, ts_expires, host, proto, ip, country, ua_browser_name, ua_browser_version, ua_os_name, ua_os_version, ua_device
        from temp_cm_user_sessions;

-- cm_domain_page_views
create temporary table temp_cm_domain_page_views as
    select * from cm_domain_page_views;
drop table cm_domain_page_views;
create table cm_domain_page_views (
    page_id            uuid                   not null, -- Reference to the page
    ts_created         timestamp              not null, -- When the record was created
    proto              varchar(32) default '' not null, -- The protocol version, like "HTTP/1.0"
    ip                 varchar(39) default '' not null, -- IP address the session was created from
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

insert into cm_domain_page_views(page_id, ts_created, proto, ip, country, ua_browser_name, ua_browser_version, ua_os_name, ua_os_version, ua_device)
    select page_id, ts_created, proto, ip, country, ua_browser_name, ua_browser_version, ua_os_name, ua_os_version, ua_device
        from temp_cm_domain_page_views;

------------------------------------------------------------------------------------------------------------------------
-- Add new columns to domain users
------------------------------------------------------------------------------------------------------------------------
alter table cm_domains_users add column notify_comment_status boolean       default true not null; -- Whether the user is to be notified about status changes (approved/rejected) of their comments
alter table cm_domains_users add column moderation_paths      varchar(4096) default ''   not null; -- Paths the user receives moderation notifications for (moderators only)
