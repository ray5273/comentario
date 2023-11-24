import { Injectable } from '@angular/core';
import { merge, Observable, of, Subject, tap } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { ApiGeneralService, Principal } from '../../generated-api';

@Injectable({
    providedIn: 'root',
})
export class AuthService {

    /** Last set URL to redirect to after a successful login. */
    afterLoginRedirectUrl?: string;

    /** Timestamp of the last time the principal was updated (fetched or reset). */
    principalUpdated = 0;

    /** Primary observable for obtaining the principals. If the user isn't logged in, undefined is emitted. */
    readonly principal: Observable<Principal | undefined>;

    /** Observable that triggers a server re-fetch of the currently logged in principal */
    private readonly _update$ = new Subject<Principal | null | undefined>();

    constructor(
        private readonly api: ApiGeneralService,
    ) {
        this.principal = merge(
            // Initially fetch a user
            this.safeFetchPrincipal(),
            // Mix-in any additional principals from other methods or fetch it from the server, if undefined is given
            this._update$.pipe(switchMap(p => p === undefined ? this.safeFetchPrincipal() : of(p ?? undefined))),
        )
        .pipe(
            // Save the principal update timestamp
            tap(() => this.principalUpdated = Date.now()),
            // Cache the last result
            shareReplay(1));
    }

    /**
     * Log into the server and return the principal.
     * @param email User's email.
     * @param password User's password.
     */
    login(email: string, password: string): Observable<Principal> {
        return this.api.authLogin({email, password})
            .pipe(map(p => {
                // Store the returned principal
                this._update$.next(p);
                return p;
            }));
    }

    /**
     * Log out the current user and return an observable for successful completion.
     */
    logout(): Observable<void> {
        return this.api.authLogout().pipe(tap(() => this._update$.next(null)));
    }

    /**
     * Update the current principal to the provided value, if any. If null is provided, remove the current principal,
     * if nothing (=undefined) is provided, trigger its reloading from the backend.
     */
    update(principal?: Principal | null): void {
        this._update$.next(principal);
    }

    /**
     * An Observable that returns a Principal and never errors, returning a null instead.
     */
    private safeFetchPrincipal(): Observable<Principal | undefined> {
        return this.api.curUserGet()
            // In case of error (shouldn't normally happen) we simply consider user isn't authenticated
            .pipe(catchError(() => of(undefined)));
    }
}
