import { inject } from '@angular/core';
import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from './toast.service';
import { PrincipalService } from './principal.service';

/** HTTP context token that, when set to false, inhibits the standard error handling (error toasts and such). */
export const HTTP_ERROR_HANDLING = new HttpContextToken<boolean>(() => true);

/** HTTP interceptor function that catches errors from HTTP requests and displays a corresponding error toasts. */
export const httpErrorHandlerInterceptor: HttpInterceptorFn = (req, next) => {
    // Inject the dependencies
    const toastSvc = inject(ToastService);
    const principalSvc = inject(PrincipalService);

    // Run the original handler(s)
    return next(req)
        .pipe(catchError((error: HttpErrorResponse) => {
            // If we're not to bypass the error handling
            if (req.context.get(HTTP_ERROR_HANDLING)) {
                const errorId = error.error?.id;
                const details = error.error?.details;

                // Client-side error
                if (error.error instanceof ErrorEvent) {
                    toastSvc.error({messageId: errorId, errorCode: -1, details, error: error.error});

                // 401 Unauthorized from the backend, but not a login-related error
                } else if (error.status === 401 && errorId !== 'invalid-credentials') {
                    // Remove the current principal if it's a 401 error, which means the user isn't logged in (anymore)
                    principalSvc.setPrincipal(undefined);

                    // Add an info toast that the user has to relogin
                    toastSvc.info({messageId: errorId, errorCode: 401, details});

                // Any other server-side error
                } else {
                    toastSvc.error({messageId: errorId, errorCode: error.status, details, error});
                }
            }

            // Rethrow the error
            return throwError(() => error);
        }));
};
