import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TokenGuard } from './token.guard';

describe('TokenGuard', () => {

    let guard: TokenGuard;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
        });
        guard = TestBed.inject(TokenGuard);
    });

    it('is created', () => {
        expect(guard).toBeTruthy();
    });
});
