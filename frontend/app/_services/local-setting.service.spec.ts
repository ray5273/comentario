import { TestBed } from '@angular/core/testing';
import { LocalSettingService } from './local-setting.service';

describe('LocalSettingService', () => {

    let service: LocalSettingService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(LocalSettingService);
    });

    it('is created', () => {
        expect(service).toBeTruthy();
    });
});
