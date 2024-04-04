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
-- Add edited fields to comments
------------------------------------------------------------------------------------------------------------------------
alter table cm_comments add column ts_edited timestamp; -- When the comment text was last edited. null if it's never been edited
alter table cm_comments add column user_edited uuid     -- Reference to the user who last edited the comment
    references cm_users(id) on delete set null;

------------------------------------------------------------------------------------------------------------------------
-- Add login audit columns for users
------------------------------------------------------------------------------------------------------------------------
alter table cm_users add column ts_last_login         timestamp;                      -- When the user last logged in successfully. null if user never logged in
alter table cm_users add column ts_last_failed_login  timestamp;                      -- When the user last failed to log in due to wrong credentials. null if there was never a failed login
alter table cm_users add column failed_login_attempts integer default 0 not null;     -- Number of failed login attempts
alter table cm_users add column is_locked             boolean default false not null; -- Whether the user is locked out
alter table cm_users add column ts_locked             timestamp;                      -- When the user was locked. null if the user isn't locked
