import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { CommentService } from './comment.service';
import { ApiGeneralService } from '../../../../generated-api';
import { mockDomainSelector } from '../../../_utils/_mocks.spec';

describe('CommentService', () => {

    let service: CommentService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                MockProvider(ApiGeneralService),
                mockDomainSelector(),
            ],
        });
        service = TestBed.inject(CommentService);
    });

    it('is created', () => {
        expect(service).toBeTruthy();
    });
});
