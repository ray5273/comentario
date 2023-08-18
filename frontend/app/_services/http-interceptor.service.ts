import { Injectable } from '@angular/core';
import {
    HttpContextToken,
    HttpErrorResponse,
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';

/** HTTP context token that, when set to false, inhibits the standard error handling (error toasts and such). */
export const HTTP_ERROR_HANDLING = new HttpContextToken<boolean>(() => true);

@Injectable({
    providedIn: 'root',
})
export class HttpInterceptorService implements HttpInterceptor {

    constructor(
        private readonly toastSvc: ToastService,
        private readonly authSvc: AuthService,
    ) {}

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>>{
        // Run the original handler(s)
        return next.handle(req)
            .pipe(catchError((error: HttpErrorResponse) => {
                // If we're not to bypass the error handling
                if (req.context.get(HTTP_ERROR_HANDLING)) {
                    const errorId = error.error?.id;
                    const details = error.error?.details;

                    // Client-side error
                    if (error.error instanceof ErrorEvent) {
                        this.toastSvc.error(errorId, -1, details, error.error);

                        // 401 Unauthorized from the backend, but not a login-related error
                    } else if (error.status === 401 && errorId !== 'invalid-credentials') {
                        // Remove the current principal if it's a 401 error, which means the user isn't logged in (anymore)
                        this.authSvc.update(null);

                        // Add an info toast that the user has to relogin
                        this.toastSvc.info(errorId, 401, details);

                    // Any other server-side error
                    } else {
                        this.toastSvc.error(errorId, error.status, details, error);
                    }
                }

                // Rethrow the error
                return throwError(() => error);
            }));
    }
}
