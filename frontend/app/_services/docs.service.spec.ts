import { TestBed } from '@angular/core/testing';
import { DocsService } from './docs.service';
import { ConfigServiceMock } from '../_testing/mocks.spec';
import { ConfigService } from './config.service';

describe('DocsService', () => {
    let service: DocsService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                {provide: ConfigService, useValue: ConfigServiceMock},
            ],
        });
        service = TestBed.inject(DocsService);
    });

    it('is created', () => {
        expect(service).toBeTruthy();
    });
});
