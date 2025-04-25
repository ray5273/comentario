import { Injectable } from '@angular/core';
import { HttpContext } from '@angular/common/http';
import { finalize, Observable, of, tap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiGeneralService, Configuration, Principal } from '../../generated-api';
import { HTTP_ERROR_HANDLING } from './http-error-handler.interceptor';
import { PrincipalService } from './principal.service';

@Injectable({
    providedIn: 'root',
})
export class AuthService {

    /** Last set URL to redirect to after a successful login. */
    afterLoginRedirectUrl?: string;

    constructor(
        private readonly apiConfig: Configuration,
        private readonly api: ApiGeneralService,
        private readonly principalSvc: PrincipalService,
    ) {
        // Initially fetch a user
        this.update();
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
                this.principalSvc.setPrincipal(p);
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
                tap(p => this.principalSvc.setPrincipal(p)),
                // Remove the token from the API config upon completion
                finalize(() => delete this.apiConfig.credentials.token));
    }

    /**
     * Log out the current user and return an observable for successful completion.
     */
    logout(): Observable<void> {
        return this.api.authLogout().pipe(tap(() => this.principalSvc.setPrincipal(undefined)));
    }

    /**
     * Trigger a principal reload from the backend.
     */
    update(): void {
        this.safeFetchPrincipal().subscribe(p => this.principalSvc.setPrincipal(p));
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
