import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { PluginService } from './plugin.service';
import { LANGUAGE } from '../../../../environments/languages';
import { PluginMessageService } from './plugin-message.service';
import { mockConfigService } from '../../../_utils/_mocks.spec';

describe('PluginService', () => {

    let service: PluginService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers:[
                {provide: LANGUAGE, useValue: {}},
                mockConfigService(),
                MockProvider(PluginMessageService),
            ],
        });
        service = TestBed.inject(PluginService);
    });

    it('is created', () => {
        expect(service).toBeTruthy();
    });
});
