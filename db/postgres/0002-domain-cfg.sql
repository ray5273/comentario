------------------------------------------------------------------------------------------------------------------------
-- Create domain configuration table
------------------------------------------------------------------------------------------------------------------------
create table cm_domain_configuration (
    domain_id    uuid                                   not null, -- Reference to the domain
    key          varchar(255)                           not null, -- Configuration item key
    value        varchar(255) default ''                not null, -- Item value
    ts_updated   timestamp    default current_timestamp not null, -- Timestamp when the item was last updated in the database
    user_updated uuid                                             -- Reference to the user who last updated the item in the database
);

-- Constraints
alter table cm_domain_configuration add primary key (domain_id, key);
alter table cm_domain_configuration add constraint fk_domain_configuration_domain_id    foreign key (domain_id)    references cm_domains(id) on delete cascade;
alter table cm_domain_configuration add constraint fk_domain_configuration_user_updated foreign key (user_updated) references cm_users(id)   on delete set null;
