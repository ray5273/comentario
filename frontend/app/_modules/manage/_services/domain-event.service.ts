import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { DomainEvent } from '../_models/domain-event';

@Injectable({
    providedIn: 'root',
})
export class DomainEventService {

    /** Emitted domain events. */
    readonly events = new Subject<DomainEvent>();
}
