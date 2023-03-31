import { TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { MockService } from 'ng-mocks';
import { DocsService } from './docs.service';
import { ConfigService } from './config.service';

describe('DocsService', () => {

    let service: DocsService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                {provide: LOCALE_ID,     useValue: 'it'},
                {provide: ConfigService, useValue: MockService(ConfigService, {docsBaseUrl: 'https://whatever.org'})},
            ],
        });
        service = TestBed.inject(DocsService);
    });

    it('is created', () => {
        expect(service).toBeTruthy();
    });

    it('returns home URL', () => {
        expect(service.urlHome).toBe('https://whatever.org/it/');
    });

    it('returns about URL', () => {
        expect(service.urlAbout).toBe('https://whatever.org/it/about/');
    });

    it('returns embed page URL', () => {
        expect(service.getEmbedPageUrl('rabbit-breeding')).toBe('https://whatever.org/it/embed/rabbit-breeding/');
    });

    it('returns page URL for default language', () => {
        expect(service.getPageUrl('uh/oh/eh/page.html')).toBe('https://whatever.org/it/uh/oh/eh/page.html');
    });

    it('returns page URL for specified language', () => {
        expect(service.getPageUrl('uh/oh/eh/page.html', 'zx')).toBe('https://whatever.org/zx/uh/oh/eh/page.html');
    });
});
