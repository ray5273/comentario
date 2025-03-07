import { Domain } from '../../../../generated-api';

export interface DomainEvent {
    /** Event kind. */
    kind: 'create' | 'delete' | 'update';

    /** Domain in question. */
    domain: Domain;
}
