import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MockProviders } from 'ng-mocks';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../_services/auth.service';

describe('AuthGuard', () => {

    let guard: AuthGuard;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [MockProviders(AuthService)],
        });
        guard = TestBed.inject(AuthGuard);
    });

    it('is created', () => {
        expect(guard).toBeTruthy();
    });
});
