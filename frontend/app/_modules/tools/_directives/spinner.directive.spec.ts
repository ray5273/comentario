import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SpinnerDirective, SpinnerSize } from './spinner.directive';

@Component({
    template: '<button [appSpinner]="value" [spinnerSize]="size" [spinnerText]="text">text</button>',
})
class TestComponent {
    value = false;
    size: SpinnerSize = 'sm';
    text?: string;
}

describe('SpinnerDirective', () => {

    let fixture: ComponentFixture<TestComponent>;
    let de: DebugElement[];
    let button: HTMLButtonElement;

    beforeEach(() => {
        fixture = TestBed.configureTestingModule({
            declarations: [SpinnerDirective, TestComponent],
        })
            .createComponent(TestComponent);
        fixture.detectChanges();

        // All elements with an attached directive
        de = fixture.debugElement.queryAll(By.directive(SpinnerDirective));

        // Fetch the native element
        button = de[0].nativeElement as HTMLButtonElement;
    });

    it('has one element', () => {
        expect(de.length).toBe(1);
        expect(button).toBeTruthy();
    });

    it('is initially enabled and not spinning', () => {
        expect(button.disabled).toBeFalse();
        expect(button.classList).not.toContain('is-spinning-sm');
        expect(button.classList).not.toContain('is-spinning-lg');
    });

    it('updates disabled immediately, but not spinning', () => {
        // Enable spinning
        fixture.componentInstance.value = true;
        fixture.detectChanges();
        expect(button.disabled).toBeTrue();

        // Disable spinning
        fixture.componentInstance.value = false;
        fixture.detectChanges();
        expect(button.disabled).toBeFalse();
    });

    it('starts spinner with size "sm"', fakeAsync(() => {
        // Enable spinning
        fixture.componentInstance.value = true;
        fixture.detectChanges();

        // No classes are assigned yet
        expect(button.classList).not.toContain('is-spinning-sm');
        expect(button.classList).not.toContain('is-spinning-lg');

        // One class gets assigned after 200 ms
        tick(250);
        expect(button.classList).toContain('is-spinning-sm');
        expect(button.classList).not.toContain('is-spinning-lg');

        // Disable spinning
        fixture.componentInstance.value = false;
        fixture.detectChanges();

        // The class disappears immediately
        expect(button.classList).not.toContain('is-spinning-sm');
        expect(button.classList).not.toContain('is-spinning-lg');
    }));

    it('starts spinner with size "lg"', fakeAsync(() => {
        // Enable spinning
        fixture.componentInstance.value = true;
        fixture.componentInstance.size = 'lg';
        fixture.detectChanges();

        // No classes are assigned yet
        expect(button.classList).not.toContain('is-spinning-sm');
        expect(button.classList).not.toContain('is-spinning-lg');

        // One class gets assigned after 200 ms
        tick(250);
        expect(button.classList).not.toContain('is-spinning-sm');
        expect(button.classList).toContain('is-spinning-lg');

        // Disable spinning
        fixture.componentInstance.value = false;
        fixture.detectChanges();

        // The class disappears immediately
        expect(button.classList).not.toContain('is-spinning-sm');
        expect(button.classList).not.toContain('is-spinning-lg');
    }));

    it('places spinner text into data attribute', () => {
        // No text attribute at all initially
        expect(button.getAttribute('data-spinner-text')).toBeNull();

        // Set the spinner text
        fixture.componentInstance.text = 'Spinning';
        fixture.detectChanges();
        expect(button.getAttribute('data-spinner-text')).toBe('Spinning');

        // Update spinner text
        fixture.componentInstance.text = '';
        fixture.detectChanges();
        expect(button.getAttribute('data-spinner-text')).toBe('');

        // Remove spinner text
        fixture.componentInstance.text = undefined;
        fixture.detectChanges();
        expect(button.getAttribute('data-spinner-text')).toBeNull();
    });
});
