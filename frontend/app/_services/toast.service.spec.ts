import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ToastService } from './toast.service';

describe('ToastService', () => {

    let service: ToastService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [RouterModule.forRoot([])],
        });
        service = TestBed.inject(ToastService);
    });

    it('is created', () => {
        expect(service).toBeTruthy();
    });
});
