import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgbTooltip, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CopyTextDirective } from './copy-text.directive';

@Component({
    template: `
        <button id="btn1" type="button" appCopyText="example1">x</button>
        <button id="btn2" type="button" appCopyText="example2" ngbTooltip="">y</button>
    `,
    imports: [NgbTooltipModule, CopyTextDirective],
})
class TestComponent {
    value = false;
}

describe('CopyTextDirective', () => {

    let fixture: ComponentFixture<TestComponent>;
    let de: DebugElement[];
    let btn1: HTMLButtonElement;
    let btn2: HTMLButtonElement;

    beforeEach(() => {
        fixture = TestBed.configureTestingModule({
                imports: [NgbTooltipModule, CopyTextDirective, TestComponent],
            })
            .createComponent(TestComponent);
        fixture.detectChanges();

        // All elements with an attached directive
        de = fixture.debugElement.queryAll(By.directive(CopyTextDirective));

        // Fetch the native element
        btn1 = de[0].nativeElement as HTMLButtonElement;
        btn2 = de[1].nativeElement as HTMLButtonElement;
    });

    it('binds to elements', () => {
        expect(de.length).toBe(2);
    });

    it('updates title when no tooltip is available', () => {
        expect(btn1.getAttribute('title')).toBe('Click to copy');
        expect(btn2.getAttribute('title')).toBeNull();
    });

    it('updates tooltip when available', () => {
        const tt: NgbTooltip = fixture.debugElement.query(By.directive(NgbTooltip)).injector.get(NgbTooltip);
        expect(tt.ngbTooltip).toBe('Click to copy');
        expect(tt.autoClose).toBeFalse();
        expect(tt.animation).toBeFalse();
    });

    it('copies text when clicked', () => {
        spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
        btn1.click();
        expect(navigator.clipboard.writeText).toHaveBeenCalledOnceWith('example1');
    });

    it('copies text and updates tooltip when clicked', fakeAsync(() => {
        // Prepare
        const tt: NgbTooltip = fixture.debugElement.query(By.directive(NgbTooltip)).injector.get(NgbTooltip);
        spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
        spyOn(tt, 'open').and.callThrough();
        spyOn(tt, 'close').and.callThrough();
        const tooltipSpy = spyOnProperty(tt, 'ngbTooltip', 'set').and.callThrough();

        // Test
        btn2.click();
        tick();

        // Verify
        expect(navigator.clipboard.writeText).toHaveBeenCalledOnceWith('example2');
        expect(tt.open).toHaveBeenCalledTimes(1);
        expect(tt.close).toHaveBeenCalledTimes(1);
        expect(tooltipSpy.calls.count()).toBe(2);
        expect(tooltipSpy.calls.argsFor(0)).toEqual(['Copied!']);
        expect(tooltipSpy.calls.argsFor(1)).toEqual(['Click to copy']);
    }));
});
