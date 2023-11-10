import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { CommentService } from './comment.service';
import { ApiGeneralService } from '../../../../generated-api';
import { DomainMeta, DomainSelectorService } from './domain-selector.service';

describe('CommentService', () => {

    let service: CommentService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(DomainSelectorService, {domainMeta: () => of(new DomainMeta())}),
            ],
        });
        service = TestBed.inject(CommentService);
    });

    it('is created', () => {
        expect(service).toBeTruthy();
    });
});
