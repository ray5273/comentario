import { TestBed } from '@angular/core/testing';
import { MockProviders } from 'ng-mocks';
import { HttpInterceptorService } from './http-interceptor.service';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';

describe('InterceptorService', () => {

    let service: HttpInterceptorService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [HttpInterceptorService, MockProviders(ToastService, AuthService)],
        });
        service = TestBed.inject(HttpInterceptorService);
    });

    it('is created', () => {
        expect(service).toBeTruthy();
    });
});
