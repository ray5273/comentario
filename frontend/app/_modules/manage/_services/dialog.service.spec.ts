import { TestBed } from '@angular/core/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MockProvider } from 'ng-mocks';
import { DialogService } from './dialog.service';

describe('DialogService', () => {
    let service: DialogService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                MockProvider(NgbModal),
            ],
        });
        service = TestBed.inject(DialogService);
    });

    it('is created', () => {
        expect(service).toBeTruthy();
    });
});
