import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { DomainSelectorService } from './domain-selector.service';
import { ApiGeneralService } from '../../../../generated-api';
import { LocalSettingService } from '../../../_services/local-setting.service';
import { AuthService } from '../../../_services/auth.service';

describe('DomainSelectorService', () => {

    let service: DomainSelectorService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                // Need to explicitly declare the service as provider because it's scoped to the module
                DomainSelectorService,
                MockProvider(AuthService, {principal: of(null)}),
                MockProvider(ApiGeneralService),
                MockProvider(LocalSettingService),
            ],
        });
        service = TestBed.inject(DomainSelectorService);
    });

    it('is created', () => {
        expect(service).toBeTruthy();
    });
});
