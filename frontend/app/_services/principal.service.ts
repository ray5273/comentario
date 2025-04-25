import { computed, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import { Principal } from '../../generated-api';

/**
 * Service that keeps and provides the currently authenticated principal, if any.
 */
@Injectable({
    providedIn: 'root',
})
export class PrincipalService {

    /** Current principal observable. */
    readonly principal$: Observable<Principal | undefined> = new ReplaySubject(1);

    /** Current principal as a signal. */
    readonly principal = toSignal(this.principal$);

    // noinspection CommaExpressionJS
    /** Timestamp of the last time the principal was updated (fetched or reset). */
    readonly updatedTime = computed(() => (this.principal(), Date.now()));

    /** Set the current principal value, or remove it if `undefined` is passed. */
    setPrincipal(p: Principal | undefined) {
        (this.principal$ as BehaviorSubject<Principal | undefined>).next(p);
    }
}
