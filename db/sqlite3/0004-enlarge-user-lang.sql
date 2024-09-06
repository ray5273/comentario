------------------------------------------------------------------------------------------------------------------------
-- Enlarge user language column
------------------------------------------------------------------------------------------------------------------------

alter table cm_users rename column lang_id to _lang_id;
alter table cm_users add column lang_id varchar(255) default 'en' not null;
update cm_users set lang_id = _lang_id;
alter table cm_users drop column _lang_id;
