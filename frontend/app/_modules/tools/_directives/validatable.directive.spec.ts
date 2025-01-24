import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ValidatableDirective } from './validatable.directive';

class KindaControl {
    constructor(
        public touched: boolean,
        public valid:   boolean,
        public invalid: boolean,
    ) {}
}

@Component({
    template: `
        <input appValidatable type="text" id="inp1">
        <input appValidatable [validateUntouched]="true" type="text" id="inp2">
        <input [appValidatable]="control" type="text" id="inp3">
        <input [appValidatable]="control" [validateUntouched]="true" type="text" id="inp4">
    `,
    imports: [ValidatableDirective],
})
class TestComponent {
    control = new KindaControl(false, false, false);
}

describe('ValidatableDirective', () => {

    let fixture: ComponentFixture<TestComponent>;
    let des: DebugElement[];
    let inputs: HTMLInputElement[];
    let classList: DOMTokenList;
    let control: KindaControl;

    beforeEach(() => {
        fixture = TestBed.configureTestingModule({
                imports: [ValidatableDirective, TestComponent],
            })
            .createComponent(TestComponent);
        fixture.detectChanges();

        // Find the element with an attached directive
        des = fixture.debugElement.queryAll(By.directive(ValidatableDirective));
        inputs = des.map(de => de.nativeElement);
        control = fixture.componentInstance.control;
    });

    const expectClasses = (classes: string[]) => {
        fixture.detectChanges();
        expect(Array.from(classList)).toEqual(classes);
    };

    it('binds to selector', () => {
        expect(des.length).toBe(4);
        expect(inputs.map(i => i.id)).toEqual(['inp1', 'inp2', 'inp3', 'inp4']);
    });

    describe('using host classes and validateUntouched = false', () => {

        beforeEach(() => classList = inputs[0].classList);

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

    describe('using host classes and validateUntouched = true', () => {

        beforeEach(() => classList = inputs[1].classList);

        it('sets and removes is-valid class', () => {
            expectClasses([]);

            classList.add('ng-valid');
            expectClasses(['ng-valid', 'is-valid']);

            classList.add('ng-touched');
            expectClasses(['ng-valid', 'is-valid', 'ng-touched']);

            classList.remove('ng-touched');
            expectClasses(['ng-valid', 'is-valid']);

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
            expectClasses(['ng-invalid', 'is-invalid']);

            classList.add('ng-touched');
            expectClasses(['ng-invalid', 'is-invalid', 'ng-touched']);

            classList.remove('ng-touched');
            expectClasses(['ng-invalid', 'is-invalid']);

            classList.remove('ng-invalid');
            expectClasses([]);

            classList.add('ng-touched');
            expectClasses(['ng-touched']);

            classList.add('ng-invalid');
            expectClasses(['ng-touched', 'ng-invalid', 'is-invalid']);
        });
    });

    describe('using another control and validateUntouched = false', () => {

        beforeEach(() => classList = inputs[2].classList);

        it('sets and removes is-valid class', () => {
            expectClasses([]);

            control.valid = true;
            expectClasses([]);

            control.touched = true;
            expectClasses(['is-valid']);

            control.touched = false;
            expectClasses([]);

            control.valid = false;
            expectClasses([]);

            control.touched = true;
            expectClasses([]);

            control.valid = true;
            expectClasses(['is-valid']);
        });

        it('sets and removes is-invalid class', () => {
            expectClasses([]);

            control.invalid = true;
            expectClasses([]);

            control.touched = true;
            expectClasses(['is-invalid']);

            control.touched = false;
            expectClasses([]);

            control.invalid = false;
            expectClasses([]);

            control.touched = true;
            expectClasses([]);

            control.invalid = true;
            expectClasses(['is-invalid']);
        });
    });

    describe('using another control and validateUntouched = true', () => {

        beforeEach(() => classList = inputs[3].classList);

        it('sets and removes is-valid class', () => {
            expectClasses([]);

            control.valid = true;
            expectClasses(['is-valid']);

            control.touched = true;
            expectClasses(['is-valid']);

            control.touched = false;
            expectClasses(['is-valid']);

            control.valid = false;
            expectClasses([]);

            control.touched = true;
            expectClasses([]);

            control.valid = true;
            expectClasses(['is-valid']);
        });

        it('sets and removes is-invalid class', () => {
            expectClasses([]);

            control.invalid = true;
            expectClasses(['is-invalid']);

            control.touched = true;
            expectClasses(['is-invalid']);

            control.touched = false;
            expectClasses(['is-invalid']);

            control.invalid = false;
            expectClasses([]);

            control.touched = true;
            expectClasses([]);

            control.invalid = true;
            expectClasses(['is-invalid']);
        });
    });
});
