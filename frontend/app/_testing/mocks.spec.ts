/**
 * Declarations of mocked services.
 */
import { noop, of } from 'rxjs';
import { ToastService } from '../_services/toast.service';
import { AuthService } from '../_services/auth.service';
import { ApiAuthService, ApiOwnerService, Principal } from '../../generated-api';

export const MockPrincipal: Principal = {
    id:          '3095476039754607235673945067839458603987456038745528734659278423',
    email:       'user@example.com',
    name:        'User',
    isConfirmed: true,
};

// noinspection JSUnusedLocalSymbols
export const AuthServiceMock: Partial<AuthService> = {
    principal:     of(MockPrincipal),
    lastPrincipal: of(MockPrincipal),
    login:         (email, password) => of(MockPrincipal),
    logout:        () => of(undefined),
};

// noinspection JSUnusedLocalSymbols
export const ToastServiceMock: Partial<ToastService> = {
    clear:             noop,
    addToast:          (severity, id?, errorCode?, message?) => this as any,
    keepOnRouteChange: () => this as any,
    remove:            noop,
    info:              (id, errorCode?, message?, details?) => this as any,
    success:           (id, errorCode?, message?, details?) => this as any,
    warning:           (id, errorCode?, message?, details?) => this as any,
    error:             (id, errorCode?, message?, details?) => this as any,
};

// eslint-disable-next-line @typescript-eslint/ban-types
const getApiMock = <T>(token: T): jasmine.SpyObj<T> => {
    // Fetch the service method names
    const serviceMethods = Object.getOwnPropertyNames((token as any).prototype)
        // Exclude the constructor and responses
        .filter(m => m !== 'constructor' && !m.match(/Response$/));
    // Make a spy object stubbing every method
    const instance: jasmine.SpyObj<T> = jasmine.createSpyObj('ApiAuthService', serviceMethods);
    // Make every method return an empty observable
    serviceMethods.forEach(m => (instance as any)[m].and.returnValue(of({})));
    return instance;

};

export type MockApiAuthService = jasmine.SpyObj<ApiAuthService>;
export const getApiAuthServiceMock = () => getApiMock(ApiAuthService);

export type MockApiOwnerService = jasmine.SpyObj<ApiOwnerService>;
export const getApiOwnerServiceMock = () => getApiMock(ApiOwnerService);
