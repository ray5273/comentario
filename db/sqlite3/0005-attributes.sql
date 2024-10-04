------------------------------------------------------------------------------------------------------------------------
-- Add domain attributes table
------------------------------------------------------------------------------------------------------------------------

create table cm_domain_attrs (
    domain_id  uuid,                                             -- Reference to the domain and a part of the primary key
    key        varchar(255),                                     -- Attribute key
    value      varchar(4096) default ''                not null, -- Attribute value
    ts_updated timestamp     default current_timestamp not null, -- When the record was last updated
    -- Constraints
    primary key (domain_id, key),
    constraint fk_domain_attrs_domain_id foreign key (domain_id) references cm_domains(id) on delete cascade
);

------------------------------------------------------------------------------------------------------------------------
-- Enlarge value column in the user attributes table
------------------------------------------------------------------------------------------------------------------------

alter table cm_user_attrs rename column value to _value;
alter table cm_user_attrs add column value varchar(4096) default '' not null;
update cm_user_attrs set value = _value;
alter table cm_user_attrs drop column _value;
