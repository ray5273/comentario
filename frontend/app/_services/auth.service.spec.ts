// noinspection DuplicatedCode

import { TestBed } from '@angular/core/testing';
import { Observable, of, skip, throwError } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { AuthService } from './auth.service';
import { ApiGeneralService, Configuration, Principal } from '../../generated-api';

describe('AuthService', () => {

    let service: AuthService;
    let api: ApiGeneralService;
    let principalResponse: Observable<Principal | undefined>;

    const principal1: Principal = {
        id: 'one',
    };
    const principal2: Principal = {
        id: 'two',
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(Configuration),
            ],
        });
        api = TestBed.inject(ApiGeneralService);
        spyOn(api, 'curUserGet').and.callFake(() => principalResponse as Observable<any>);
    });

    it('is created', () => {
        principalResponse = of(undefined);
        service = TestBed.inject(AuthService);
        expect(service).toBeTruthy();
    });

    it('fetches principal on creation', (done) => {
        // Prepare
        principalResponse = of(principal1);

        // Test
        service = TestBed.inject(AuthService);
        service.principal.subscribe(p => {
            // Verify
            expect(p).toBeTruthy();
            expect(p!.id).toBe('one');
            done();
        });
    });

    it('emits undefined principal on creation when user not authenticated', (done) => {
        principalResponse = of(undefined);

        // Test
        service = TestBed.inject(AuthService);
        service.principal.subscribe(p => {
            // Verify
            expect(p).toBeUndefined();
            done();
        });
    });

    it('emits undefined principal on creation on API error', (done) => {
        // Prepare
        principalResponse = throwError(() => 'ai-ai-ai');

        // Test
        service = TestBed.inject(AuthService);
        service.principal.subscribe(p => {
            // Verify
            expect(p).toBeUndefined();
            done();
        });
    });

    it('re-fetches principal on update', (done) => {
        // Prepare
        principalResponse = of(principal1);

        // Test
        service = TestBed.inject(AuthService);
        service.principal
            .pipe(skip(1))
            .subscribe(p => {
                // Verify
                expect(p).toBeTruthy();
                expect(p!.id).toBe('two');
                done();
            });
        principalResponse = of(principal2);
        service.update();
    });

    it('saves and reuses principal when provided with update', (done) => {
        // Prepare
        principalResponse = of(principal1);

        // Test
        service = TestBed.inject(AuthService);
        service.principal
            .pipe(skip(1))
            .subscribe(p => {
                // Verify
                expect(p).toBeTruthy();
                expect(p!.id).toBe('two');
                done();
            });
        service.update(principal2);
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
