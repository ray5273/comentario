import { TestBed } from '@angular/core/testing';
import { of, skip, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiService } from '../api/services/api.service';
import { getApiServiceMock, MockApiService } from '../_testing/services.mock';
import { Principal } from '../api/models/principal';

describe('AuthService', () => {

    let service: AuthService;
    let api: MockApiService;

    const principal1: Principal = {
        id: 'one',
        roles: ['USER', 'ADMIN'],
        servicePlan: {},
        balance: {},
    };
    const principal2: Principal = {
        id: 'two',
        roles: ['USER'],
        servicePlan: {},
        balance: {},
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                {provide: ApiService, useValue: getApiServiceMock()},
            ],
        });
        api = TestBed.inject(ApiService) as MockApiService;
    });

    it('is created', () => {
        service = TestBed.inject(AuthService);
        expect(service).toBeTruthy();
    });

    it('fetches principal on creation', (done) => {
        // Prepare
        api.GetUser.and.returnValue(of(principal1));

        // Test
        service = TestBed.inject(AuthService);
        service.principal.subscribe(p => {
            // Verify
            expect(p).toBeTruthy();
            expect(p.id).toBe('one');
            expect(p.isAdmin).toBeTrue();
            done();
        });
    });

    it('fetches null principal on creation when user not authenticated', (done) => {
        // Prepare
        api.GetUser.and.returnValue(of(undefined));

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
        api.GetUser.and.returnValue(throwError(() => 'ai-ai-ai'));

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
        api.GetUser.and.returnValues(of(principal1), of(principal2));

        // Test
        service = TestBed.inject(AuthService);
        service.principal
            .pipe(skip(1))
            .subscribe(p => {
                // Verify
                expect(p).toBeTruthy();
                expect(p.id).toBe('two');
                expect(p.isAdmin).toBeFalse();
                done();
            });
        service.update();
    });

    it('saves and reuses principal when provided with update', (done) => {
        // Prepare
        api.GetUser.and.returnValue(of(principal1));

        // Test
        service = TestBed.inject(AuthService);
        service.principal
            .pipe(skip(1))
            .subscribe(p => {
                // Verify
                expect(p).toBeTruthy();
                expect(p.id).toBe('two');
                expect(p.isAdmin).toBeFalse();
                done();
            });
        service.update(principal2);
    });

    it('returns last principal', (done) => {
        // Prepare
        api.GetUser.and.returnValue(of(principal1));

        // Test
        service = TestBed.inject(AuthService);
        service.lastPrincipal.subscribe({
            // Verify
            next: p => expect(p.id).toBe('one'),
            error: fail,
            // Expect the observable to complete after the first result
            complete: done,
        });
    });

    describe('login()', () => {

        it('returns updated principal after successful login', (done) => {
            // Prepare
            api.GetUser.and.returnValue(of(principal1));
            api.Login.and.returnValue(of(principal2));

            // Test
            service = TestBed.inject(AuthService);
            service.login('whatever', 'secret')
                // Verify
                .subscribe({
                    next: p => {
                        expect(api.Login).toHaveBeenCalledOnceWith({email: 'whatever', password: 'secret'});
                        expect(p.id).toBe('two');
                        expect(p.isAdmin).toBeFalse();
                    },
                    error: fail,
                    complete: done,
                });
        });

        it('errors on failed login', (done) => {
            // Prepare
            api.GetUser.and.returnValue(of(principal1));
            api.Login.and.returnValue(throwError(() => 'Bad blood'));

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
            api.GetUser.and.returnValue(of(principal1));
            api.Logout.and.returnValue(of(undefined));

            // Test
            service = TestBed.inject(AuthService);
            service.logout()
                // Verify
                .subscribe({
                    next: () => expect(api.Logout).toHaveBeenCalledOnceWith(),
                    error: fail,
                    complete: done,
                });
        });

        it('errors on failed logout', (done) => {
            // Prepare
            api.GetUser.and.returnValue(of(principal1));
            api.Logout.and.returnValue(throwError(() => 'ouch!'));

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
