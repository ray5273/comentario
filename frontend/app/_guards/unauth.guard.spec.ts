import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { UnauthGuard } from './unauth.guard';
import { AuthService } from '../_services/auth.service';
import { AuthServiceMock } from '../_testing/mocks.spec';

describe('UnauthGuard', () => {
    let guard: UnauthGuard;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [
                {provide: AuthService, useValue: AuthServiceMock},
            ]
        });
        guard = TestBed.inject(UnauthGuard);
    });

    it('is created', () => {
        expect(guard).toBeTruthy();
    });
});
