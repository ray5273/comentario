import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { ConfigService } from './config.service';
import { ApiGeneralService } from '../../generated-api';

describe('ConfigService', () => {

    let service: ConfigService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                MockProvider(ApiGeneralService, {configExtensionsGet: () => of({extensions: undefined}) as any}),
            ],
        });
        window.Cypress = undefined;
    });

    it('is created', () => {
        service = TestBed.inject(ConfigService);
        expect(service).toBeTruthy();
    });

    it('sets under-test flag to false when no Cypress is available', () => {
        service = TestBed.inject(ConfigService);
        expect(service.isUnderTest).toBeFalse();
    });

    it('sets under-test flag to true with Cypress available', () => {
        window.Cypress = {} as any;
        service = TestBed.inject(ConfigService);
        expect(service.isUnderTest).toBeTrue();
    });
});
