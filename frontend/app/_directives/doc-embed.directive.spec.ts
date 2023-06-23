import { Component, LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MockProvider } from 'ng-mocks';
import { DocEmbedDirective } from './doc-embed.directive';
import { DocsService } from '../_services/docs.service';
import { ConfigService } from '../_services/config.service';

@Component({
    template: '<div docEmbed="test"></div>',
})
class TestComponent {
}

describe('DocEmbedDirective', () => {

    let httpTestingController: HttpTestingController;
    let fixture: ComponentFixture<TestComponent>;

    const getDiv = () =>
        fixture.debugElement.queryAll(By.directive(DocEmbedDirective))[0].nativeElement as HTMLDivElement;

    beforeEach(() => {
        fixture = TestBed.configureTestingModule({
            declarations: [DocEmbedDirective, TestComponent],
            imports: [HttpClientTestingModule],
            providers: [
                {provide: LOCALE_ID, useValue: 'zh'},
                MockProvider(
                    DocsService,
                    {
                        getEmbedPageUrl: pageName => {
                            expect(pageName).toBe('test');
                            return 'https://page.url/';
                        },
                    }),
                MockProvider(ConfigService),
            ],
        })
        .createComponent(TestComponent);

        httpTestingController = TestBed.inject(HttpTestingController);
        fixture.detectChanges();
    });

    it('contains a placeholder initially', () => {
        // The element is initially empty
        expect(getDiv().innerHTML).toMatch(/<div class="placeholder.*">/);
        // No classes
        expect(getDiv().classList.value).toBe('');
    });

    it('requests and embeds a doc page', () => {
        // Mock the request
        const req = httpTestingController.expectOne('https://page.url/');
        expect(req.request.method).toEqual('GET');
        req.flush('<h1>Super page!</h1>');

        // After the request the HTML is updated
        expect(getDiv().innerHTML).toBe('<h1>Super page!</h1>');

        // Assert there are no more pending requests
        httpTestingController.verify();
    });

    it('displays alert on error', () => {
        // Mock the request
        const req = httpTestingController.expectOne('https://page.url/');
        expect(req.request.method).toEqual('GET');
        req.flush(null, {status: 500, statusText: 'Ouch'});

        // After the request the HTML is updated
        expect(getDiv().innerHTML).toContain('Could not load <a href="https://page.url/" target="_blank" rel="noopener">test</a> resource');

        // Assert there are no more pending requests
        httpTestingController.verify();
    });
});
