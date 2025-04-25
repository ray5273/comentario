// noinspection DuplicatedCode

import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { AuthService } from './auth.service';
import { ApiGeneralService, Configuration, Principal } from '../../generated-api';
import { PrincipalService } from './principal.service';

describe('AuthService', () => {

    let service: AuthService;
    let api: ApiGeneralService;
    let principalSvc: PrincipalService;
    let principalResponse: Observable<Principal | undefined>;
    let principals: (Principal | undefined)[];

    const principal1: Principal = {
        id: 'one',
    };
    const principal2: Principal = {
        id: 'two',
    };

    beforeEach(() => {
        principals = [];
        TestBed.configureTestingModule({
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(PrincipalService),
                MockProvider(Configuration),
            ],
        });
        api = TestBed.inject(ApiGeneralService);
        principalSvc = TestBed.inject(PrincipalService);
        spyOn(api, 'curUserGet').and.callFake(() => principalResponse as Observable<any>);
        spyOn(principalSvc, 'setPrincipal').and.callFake(p => principals.push(p));
    });

    it('is created', () => {
        principalResponse = of(undefined);
        service = TestBed.inject(AuthService);
        expect(service).toBeTruthy();
    });

    it('fetches principal on creation', () => {
        // Prepare
        principalResponse = of(principal1);

        // Test
        service = TestBed.inject(AuthService);

        // Verify
        expect(principals).toHaveSize(1);
        expect(principals[0]!.id).toBe('one');
    });

    it('emits undefined principal on creation when user not authenticated', () => {
        // Prepare
        principalResponse = of(undefined);

        // Test
        service = TestBed.inject(AuthService);

        // Verify
        expect(principals).toHaveSize(1);
        expect(principals[0]).toBeUndefined();
    });

    it('emits undefined principal on creation on API error', () => {
        // Prepare
        principalResponse = throwError(() => 'ai-ai-ai');

        // Test
        service = TestBed.inject(AuthService);

        // Verify
        expect(principals).toHaveSize(1);
        expect(principals[0]).toBeUndefined();
    });

    it('re-fetches principal on update', () => {
        // Prepare
        principalResponse = of(principal1);

        // Test
        service = TestBed.inject(AuthService);
        principalResponse = of(principal2);
        service.update();

        // Verify
        expect(principals).toHaveSize(2);
        expect(principals[0]!.id).toBe('one');
        expect(principals[1]!.id).toBe('two');
    });

    describe('login()', () => {

        it('returns updated principal after successful login', (done) => {
            // Prepare
            principalResponse = of(principal1);
            spyOn(api, 'authLogin').and.returnValue(of(principal2) as any);

            // Test
            service = TestBed.inject(AuthService);
            service.login('whatever', 'secret')
                // Verify
                .subscribe({
                    next: p => {
                        expect(api.authLogin).toHaveBeenCalledOnceWith({email: 'whatever', password: 'secret'});
                        expect(p.id).toBe('two');
                    },
                    error: fail,
                    complete: done,
                });
        });

        it('errors on failed login', (done) => {
            // Prepare
            principalResponse = of(principal1);
            spyOn(api, 'authLogin').and.returnValue(throwError(() => 'Bad blood'));

            // Test
            service = TestBed.inject(AuthService);
            service.login('whatever', 'secret')
                // Verify
                .subscribe({
                    next: fail,
                    error: err => {
                        expect(err).toBe('Bad blood');
                        done();
                    },
                    complete: fail,
                });
        });
    });

    describe('logout', () => {

        it('logs user out', (done) => {
            // Prepare
            principalResponse = of(principal1);
            spyOn(api, 'authLogout').and.returnValue(of(undefined) as any);

            // Test
            service = TestBed.inject(AuthService);
            service.logout()
                // Verify
                .subscribe({
                    next: () => expect(api.authLogout).toHaveBeenCalledOnceWith(),
                    error: fail,
                    complete: done,
                });
        });

        it('errors on failed logout', (done) => {
            // Prepare
            principalResponse = of(principal1);
            spyOn(api, 'authLogout').and.returnValue(throwError(() => 'ouch!'));

            // Test
            service = TestBed.inject(AuthService);
            service.logout()
                // Verify
                .subscribe({
                    next: fail,
                    error: err => {
                        expect(err).toBe('ouch!');
                        done();
                    },
                    complete: fail,
                });
        });
    });
});
