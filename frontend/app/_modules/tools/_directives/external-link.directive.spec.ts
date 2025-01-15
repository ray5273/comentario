import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ExternalLinkDirective } from './external-link.directive';

@Component({
    template: '<a appExternalLink="https://whatever.com/">test</a>',
    imports: [ExternalLinkDirective],
})
class TestComponent {}

describe('ExternalLinkDirective', () => {

    let fixture: ComponentFixture<TestComponent>;
    let de: DebugElement;

    beforeEach(() => {
        fixture = TestBed.configureTestingModule({
                imports: [ExternalLinkDirective, TestComponent],
            })
            .createComponent(TestComponent);
        fixture.detectChanges();
        de = fixture.debugElement.query(By.directive(ExternalLinkDirective));
    });

    it('binds to anchor', () => {
        expect(de).toBeTruthy();
    });

    it('updates the anchor', () => {
        const a: HTMLAnchorElement = de.nativeElement;
        expect(a.href).toBe('https://whatever.com/');
        expect(a.target).toBe('_blank');
        expect(a.rel).toBe('noopener noreferrer');
        expect(a.title).toBe('Open in new tab');
        expect(a.classList.item(0)).toBe('external-link');
    });
});
