import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { DomainSelectorService } from './domain-selector.service';
import { ApiGeneralService } from '../../../../generated-api';
import { LocalSettingService } from '../../../_services/local-setting.service';
import { PrincipalService } from '../../../_services/principal.service';

describe('DomainSelectorService', () => {

    let service: DomainSelectorService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                // Need to explicitly declare the service as provider because it's scoped to the module
                DomainSelectorService,
                MockProvider(ApiGeneralService),
                MockProvider(LocalSettingService),
                MockProvider(PrincipalService, {principal$: of(undefined), updatedTime: signal(0)}),
            ],
        });
        service = TestBed.inject(DomainSelectorService);
    });

    it('is created', () => {
        expect(service).toBeTruthy();
    });
});
