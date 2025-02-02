import { TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { DocsService } from './docs.service';
import { mockConfigService } from '../_utils/_mocks.spec';

describe('DocsService', () => {

    let service: DocsService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                {provide: LOCALE_ID, useValue: 'it'},
                mockConfigService(),
            ],
        });
        service = TestBed.inject(DocsService);
    });

    it('is created', () => {
        expect(service).toBeTruthy();
    });

    it('returns home URL', () => {
        expect(service.urlHome).toBe('https://docs.base.url/it/');
    });

    it('returns about URL', () => {
        expect(service.urlAbout).toBe('https://docs.base.url/it/about/');
    });

    it('returns embed page URL', () => {
        expect(service.getEmbedPageUrl('rabbit-breeding')).toBe('https://docs.base.url/it/embed/rabbit-breeding/');
    });

    it('returns page URL for default language', () => {
        expect(service.getPageUrl('uh/oh/eh/page.html')).toBe('https://docs.base.url/it/uh/oh/eh/page.html');
    });

    it('returns page URL for specified language', () => {
        expect(service.getPageUrl('uh/oh/eh/page.html', 'zx')).toBe('https://docs.base.url/zx/uh/oh/eh/page.html');
    });
});
