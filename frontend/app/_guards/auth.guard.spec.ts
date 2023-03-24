import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../_services/auth.service';
import { AuthServiceMock } from '../_testing/mocks.spec';

describe('AuthGuard', () => {

    let guard: AuthGuard;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [
                {provide: AuthService, useValue: AuthServiceMock},
            ]
        });
        guard = TestBed.inject(AuthGuard);
    });

    it('is created', () => {
        expect(guard).toBeTruthy();
    });
});
