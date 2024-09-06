------------------------------------------------------------------------------------------------------------------------
-- Enlarge IP address columns to accommodate IPv6 addresses
------------------------------------------------------------------------------------------------------------------------

alter table cm_comments alter column author_ip type varchar(39);
alter table cm_users    alter column signup_ip type varchar(39);
