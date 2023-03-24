import { TestBed } from '@angular/core/testing';
import { of, skip, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { getApiAuthServiceMock, MockApiAuthService } from '../_testing/mocks.spec';
import { ApiAuthService, Principal } from '../../generated-api';

describe('AuthService', () => {

    let service: AuthService;
    let api: MockApiAuthService;

    const principal1: Principal = {
        id: 'one',
    };
    const principal2: Principal = {
        id: 'two',
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                {provide: ApiAuthService, useValue: getApiAuthServiceMock()},
            ],
        });
        api = TestBed.inject(ApiAuthService) as MockApiAuthService;
    });

    it('is created', () => {
        service = TestBed.inject(AuthService);
        expect(service).toBeTruthy();
    });

    it('fetches principal on creation', (done) => {
        // Prepare
        api.curUserGet.and.returnValue(of(principal1) as any);

        // Test
        service = TestBed.inject(AuthService);
        service.principal.subscribe(p => {
            // Verify
            expect(p).toBeTruthy();
            expect(p!.id).toBe('one');
            done();
        });
    });

    it('fetches null principal on creation when user not authenticated', (done) => {
        // Prepare
        api.curUserGet.and.returnValue(of(undefined) as any);

        // Test
        service = TestBed.inject(AuthService);
        service.principal.subscribe(p => {
            // Verify
            expect(p).toBeNull();
            done();
        });
    });

    it('fetches null principal on creation on API error', (done) => {
        // Prepare
        api.curUserGet.and.returnValue(throwError(() => 'ai-ai-ai'));

        // Test
        service = TestBed.inject(AuthService);
        service.principal.subscribe(p => {
            // Verify
            expect(p).toBeNull();
            done();
        });
    });

    it('re-fetches principal on update', (done) => {
        // Prepare
        api.curUserGet.and.returnValues(of(principal1) as any, of(principal2) as any);

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
        service.update();
    });

    it('saves and reuses principal when provided with update', (done) => {
        // Prepare
        api.curUserGet.and.returnValue(of(principal1) as any);

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

    it('returns last principal', (done) => {
        // Prepare
        api.curUserGet.and.returnValue(of(principal1) as any);

        // Test
        service = TestBed.inject(AuthService);
        service.lastPrincipal.subscribe({
            // Verify
            next: p => expect(p!.id).toBe('one'),
            error: fail,
            // Expect the observable to complete after the first result
            complete: done,
        });
    });

    describe('login()', () => {

        it('returns updated principal after successful login', (done) => {
            // Prepare
            api.curUserGet.and.returnValue(of(principal1) as any);
            api.authLogin.and.returnValue(of(principal2) as any);

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
            api.curUserGet.and.returnValue(of(principal1) as any);
            api.authLogin.and.returnValue(throwError(() => 'Bad blood'));

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
            api.curUserGet.and.returnValue(of(principal1) as any);
            api.authLogout.and.returnValue(of(undefined) as any);

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
            api.curUserGet.and.returnValue(of(principal1) as any);
            api.authLogout.and.returnValue(throwError(() => 'ouch!'));

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
