import { Injectable } from '@angular/core';
import { merge, Observable, of, Subject } from 'rxjs';
import { catchError, map, shareReplay, switchMap, take } from 'rxjs/operators';
import { ApiAuthService, Principal } from '../../generated-api';

@Injectable({
    providedIn: 'root',
})
export class AuthService {

    /** Last set URL to redirect to after a successful login. */
    afterLoginRedirectUrl?: string;

    /** Primary observable for obtaining the principals. If the user isn't logged in, null is emitted. */
    readonly principal: Observable<Principal | null>;

    /** Observable that triggers a server re-fetch of the currently logged in principal */
    private readonly _update$ = new Subject<Principal | null | undefined>();

    constructor(
        private readonly api: ApiAuthService,
    ) {
        this.principal = merge(
            // Initially fetch a user
            this.safeFetchPrincipal(),
            // Mix-in any additional principals from other methods or fetch it from the server, if none provided
            this._update$.pipe(switchMap(p => p === undefined ? this.safeFetchPrincipal() : of(p))),
        )
        .pipe(
            // Cache the last result
            shareReplay(1),
        );
    }

    /**
     * Observable for obtaining the last principal, which completes as soon as the principal is received.
     */
    get lastPrincipal(): Observable<Principal | null> {
        return this.principal.pipe(take(1));
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
        return of(undefined);
        // TODO return this.api.curUserLogout().pipe(tap(() => this._update$.next(null)));
    }

    /**
     * Update the current principal to the provided value, if any, otherwise trigger its reloading from the backend.
     */
    update(principal?: Principal | null): void {
        this._update$.next(principal);
    }

    /**
     * An Observable that returns a Principal and never errors, returning a null instead.
     * @private
     */
    private safeFetchPrincipal(): Observable<Principal | null> {
        // In case of error (shouldn't normally happen) we simply consider user isn't authenticated
        return this.api.curUserGet().pipe(catchError(() => of(null)));
    }
}
