import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { MockProviders } from 'ng-mocks';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../_services/auth.service';

describe('AuthGuard', () => {

    let guard: AuthGuard;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [RouterModule.forRoot([])],
            providers: [MockProviders(AuthService)],
        });
        guard = TestBed.inject(AuthGuard);
    });

    it('is created', () => {
        expect(guard).toBeTruthy();
    });
});
