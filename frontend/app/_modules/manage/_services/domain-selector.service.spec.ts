import { TestBed } from '@angular/core/testing';
import { MockService } from 'ng-mocks';
import { DomainSelectorService } from './domain-selector.service';
import { ApiGeneralService } from '../../../../generated-api';
import { LocalSettingService } from '../../../_services/local-setting.service';

describe('DomainSelectorService', () => {

    let service: DomainSelectorService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                {provide: ApiGeneralService,   useValue: MockService(ApiGeneralService)},
                {provide: LocalSettingService, useValue: MockService(LocalSettingService)},
            ],
        });
        service = TestBed.inject(DomainSelectorService);
    });

    it('is created', () => {
        expect(service).toBeTruthy();
    });
});
