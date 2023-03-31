import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { HttpInterceptorService } from './http-interceptor.service';
import { ToastService } from './toast.service';

describe('InterceptorService', () => {

    let service: HttpInterceptorService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [HttpInterceptorService, MockProvider(ToastService)],
        });
        service = TestBed.inject(HttpInterceptorService);
    });

    it('is created', () => {
        expect(service).toBeTruthy();
    });
});
