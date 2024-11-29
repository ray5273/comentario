import { Injectable } from '@angular/core';
import { HttpContext } from '@angular/common/http';
import { finalize, merge, Observable, of, Subject, tap } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { ApiGeneralService, Configuration, Principal } from '../../generated-api';
import { HTTP_ERROR_HANDLING } from './http-error-handler.interceptor';

@Injectable({
    providedIn: 'root',
})
export class AuthService {

    /** Last set URL to redirect to after a successful login. */
    afterLoginRedirectUrl?: string;

    /** Timestamp of the last time the principal was updated (fetched or reset). */
    principalUpdated = 0;

    /**
     * Primary observable for obtaining the principals. If the user isn't logged in, undefined is emitted. Always emits
     * on a new subscription.
     */
    readonly principal: Observable<Principal | undefined>;

    /** Observable that triggers a server re-fetch of the currently logged in principal */
    private readonly _update$ = new Subject<Principal | null | undefined>();

    constructor(
        private readonly apiConfig: Configuration,
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
     * Log into the server using the provided token and return the principal.
     * @param token User-bound token with the 'login' scope
     * @param disableErrorHandling Whether to inhibit standard error handling during the request.
     */
    loginViaToken(token: string, disableErrorHandling: boolean): Observable<Principal> {
        // Store the token in the API config to be used for the token-based login
        this.apiConfig.credentials.token = token;

        // If error handling is off, set the option in a new HTTP context
        const options = disableErrorHandling ? {context: new HttpContext().set(HTTP_ERROR_HANDLING, false)} : undefined;

        // Run redemption with the API
        return this.api.authLoginTokenRedeem(undefined, undefined, options)
            .pipe(
                // Store the returned principal
                tap(p => this._update$.next(p)),
                // Remove the token from the API config upon completion
                finalize(() => delete this.apiConfig.credentials.token));
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
