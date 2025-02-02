import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DocEmbedDirective } from './doc-embed.directive';
import { mockConfigService } from '../_utils/_mocks.spec';

@Component({
    template: '<div appDocEmbed="https://page.url/test"><p>Content <span>Subcontent</span></p></div>',
    imports: [DocEmbedDirective],
})
class TestComponent {}

describe('DocEmbedDirective', () => {

    let httpTestingController: HttpTestingController;
    let fixture: ComponentFixture<TestComponent>;

    const getDiv = () =>
        fixture.debugElement.queryAll(By.directive(DocEmbedDirective))[0].nativeElement as HTMLDivElement;

    beforeEach(() => {
        fixture = TestBed.configureTestingModule({
                imports: [DocEmbedDirective, TestComponent],
                providers: [
                    provideHttpClient(),
                    provideHttpClientTesting(),
                    mockConfigService(),
                ],
            })
        .createComponent(TestComponent);

        httpTestingController = TestBed.inject(HttpTestingController);
        fixture.detectChanges();
    });

    it('contains a placeholder initially', () => {
        // The element is initially empty
        expect(getDiv().innerHTML).toBe('<p>Content <span>Subcontent</span></p>');
        // No classes
        expect(getDiv().classList.value).toBe('');
    });

    it('requests and embeds a doc page', () => {
        // Mock the request
        const req = httpTestingController.expectOne('https://page.url/test');
        expect(req.request.method).toEqual('GET');
        req.flush('<h1>Super page!</h1>');

        // After the request the HTML is updated
        expect(getDiv().innerHTML).toBe('<h1>Super page!</h1>');

        // Assert there are no more pending requests
        httpTestingController.verify();
    });

    it('displays alert on error', () => {
        // Mock the request
        const req = httpTestingController.expectOne('https://page.url/test');
        expect(req.request.method).toEqual('GET');
        req.flush(null, {status: 500, statusText: 'Ouch'});

        // After the request the HTML is updated
        expect(getDiv().innerHTML).toContain('Could not load the resource at <a href="https://page.url/test" target="_blank" rel="noopener">https://page.url/test</a>:');

        // Assert there are no more pending requests
        httpTestingController.verify();
    });
});
