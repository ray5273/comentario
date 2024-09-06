------------------------------------------------------------------------------------------------------------------------
-- Enlarge IP address columns to accommodate IPv6 addresses. Recreate columns since SQLite has no ALTER COLUMN
-- statement
------------------------------------------------------------------------------------------------------------------------

-- cm_comments.author_ip
alter table cm_comments rename column author_ip to _author_ip;
alter table cm_comments add column author_ip varchar(39) default '' not null;
update cm_comments set author_ip = _author_ip;
alter table cm_comments drop column _author_ip;

-- cm_users.signup_ip
alter table cm_users rename column signup_ip to _signup_ip;
alter table cm_users add column signup_ip varchar(39) default '' not null;
update cm_users set signup_ip = _signup_ip;
alter table cm_users drop column _signup_ip;
