------------------------------------------------------------------------------------------------------------------------
-- Add domain attributes table
------------------------------------------------------------------------------------------------------------------------

create table cm_domain_attrs (
    domain_id  uuid,                                         -- Reference to the domain and a part of the primary key
    key        varchar(255),                                 -- Attribute key
    value      varchar(255)                        not null, -- Attribute value
    ts_updated timestamp default current_timestamp not null, -- When the record was last updated
    -- Constraints
    primary key (domain_id, key),
    constraint fk_domain_attrs_domain_id foreign key (domain_id) references cm_domains(id) on delete cascade
);
