import { TestBed } from '@angular/core/testing';
import { MockProviders } from 'ng-mocks';
import { PluginMessageService } from './plugin-message.service';
import { AuthService } from '../../../_services/auth.service';

describe('PluginMessageService', () => {

    let service: PluginMessageService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [MockProviders(AuthService)],
        });
        service = TestBed.inject(PluginMessageService);
    });

    it('is created', () => {
        expect(service).toBeTruthy();
    });
});
