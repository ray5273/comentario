import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SpinnerDirective, SpinnerSize } from './spinner.directive';

@Component({
    template: '<button [appSpinner]="spinner" [spinnerSize]="size" [spinnerText]="text" [disable]="disable">text</button>',
    imports: [SpinnerDirective],
})
class TestComponent {
    spinner = false;
    size: SpinnerSize = 'sm';
    text?: string;
    disable = false;
}

describe('SpinnerDirective', () => {

    let fixture: ComponentFixture<TestComponent>;
    let de: DebugElement[];
    let button: HTMLButtonElement;

    // Wait out a timer delay in ms
    const delay = () => tick(200);

    const expectClasses = (classes: string[]) => {
        fixture.detectChanges();
        expect(Array.from(button.classList)).toEqual(classes);
    };

    beforeEach(() => {
        fixture = TestBed.configureTestingModule({
                imports: [SpinnerDirective, TestComponent],
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
        expectClasses([]);
    });

    it('updates disabled', fakeAsync(() => {
        // Enable spinning: initially not disabled
        fixture.componentInstance.spinner = true;
        fixture.detectChanges();
        expect(button.disabled).toBeFalse();

        // It gets disabled after a delay
        delay();
        fixture.detectChanges();
        expect(button.disabled).toBeTrue();

        // Disable spinning
        fixture.componentInstance.spinner = false;
        fixture.detectChanges();
        expect(button.disabled).toBeFalse();

        // Now set the disabled state explicitly
        fixture.componentInstance.disable = true;
        fixture.detectChanges();
        expect(button.disabled).toBeTrue();

        // Remove the explicit disabled state
        fixture.componentInstance.disable = false;
        fixture.detectChanges();
        expect(button.disabled).toBeFalse();
    }));

    it('starts spinner with size "sm"', fakeAsync(() => {
        // Enable spinning
        fixture.componentInstance.spinner = true;
        fixture.detectChanges();

        // No spinner and not disabled
        expectClasses([]);
        expect(button.disabled).toBeFalse();

        // Wait for the timer: the spinner is spinning, the element is disabled
        delay();
        expectClasses(['is-spinning-sm']);
        expect(button.disabled).toBeTrue();
    }));

    it('starts spinner with size "lg"', fakeAsync(() => {
        // Enable spinning
        fixture.componentInstance.size    = 'lg';
        fixture.componentInstance.spinner = true;
        fixture.detectChanges();

        // No spinner and not disabled
        expectClasses([]);
        expect(button.disabled).toBeFalse();

        // Wait for the timer: the spinner is spinning, the element is disabled
        delay();
        expectClasses(['is-spinning-lg']);
        expect(button.disabled).toBeTrue();
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
