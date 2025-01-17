import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ValidatableDirective } from './validatable.directive';

@Component({
    template: '<input appValidatable type="text" id="inp">',
    imports: [ValidatableDirective],
})
class TestComponent {}

describe('ValidatableDirective', () => {

    let fixture: ComponentFixture<TestComponent>;
    let de: DebugElement;
    let input: HTMLInputElement;
    let classList: DOMTokenList;

    beforeEach(() => {
        fixture = TestBed.configureTestingModule({
                imports: [ValidatableDirective, TestComponent],
            })
            .createComponent(TestComponent);
        fixture.detectChanges();

        // Find the element with an attached directive
        de = fixture.debugElement.query(By.directive(ValidatableDirective));
        input = de.nativeElement;
        classList = input.classList;
    });

    const expectClasses = (classes: string[]) => {
        fixture.detectChanges();
        expect(Array.from(classList)).toEqual(classes);
    };

    it('binds to selector', () => {
        expect(input.id).toBe('inp');
    });

    it('sets and removes is-valid class', () => {
        expectClasses([]);

        classList.add('ng-valid');
        expectClasses(['ng-valid']);

        classList.add('ng-touched');
        expectClasses(['ng-valid', 'ng-touched', 'is-valid']);

        classList.remove('ng-touched');
        expectClasses(['ng-valid']);

        classList.remove('ng-valid');
        expectClasses([]);

        classList.add('ng-touched');
        expectClasses(['ng-touched']);

        classList.add('ng-valid');
        expectClasses(['ng-touched', 'ng-valid', 'is-valid']);
    });

    it('sets and removes is-invalid class', () => {
        expectClasses([]);

        classList.add('ng-invalid');
        expectClasses(['ng-invalid']);

        classList.add('ng-touched');
        expectClasses(['ng-invalid', 'ng-touched', 'is-invalid']);

        classList.remove('ng-touched');
        expectClasses(['ng-invalid']);

        classList.remove('ng-invalid');
        expectClasses([]);

        classList.add('ng-touched');
        expectClasses(['ng-touched']);

        classList.add('ng-invalid');
        expectClasses(['ng-touched', 'ng-invalid', 'is-invalid']);
    });
});
