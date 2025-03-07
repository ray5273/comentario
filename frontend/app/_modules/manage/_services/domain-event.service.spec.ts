import { TestBed } from '@angular/core/testing';
import { DomainEventService } from './domain-event.service';

describe('DomainEventService', () => {

    let service: DomainEventService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(DomainEventService);
    });

    it('is created', () => {
        expect(service).toBeTruthy();
    });
});
