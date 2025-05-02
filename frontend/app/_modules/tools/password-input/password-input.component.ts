import { Component, computed, forwardRef, Injector, input, OnInit, signal } from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormsModule, NG_VALIDATORS, NG_VALUE_ACCESSOR, NgControl, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { ValidatableDirective } from '../_directives/validatable.directive';

@Component({
    selector: 'app-password-input',
    templateUrl: './password-input.component.html',
    host: {
        class: 'input-group has-validation',
    },
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => PasswordInputComponent),
            multi: true,
        },
        {
            provide: NG_VALIDATORS,
            useExisting: PasswordInputComponent,
            multi: true,
        },
    ],
    imports: [
        FormsModule,
        FaIconComponent,
        ReactiveFormsModule,
        ValidatableDirective,
    ],
})
export class PasswordInputComponent implements OnInit, ControlValueAccessor {

    /** Patterns that turn into errors when they don't match the entered value (only when strong == true). */
    static readonly Regexes = {
        upper:   /[A-Z]/,
        lower:   /[a-z]/,
        special: /[-\d!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~]/,
    };

    /** Minimum *strong* password length. */
    readonly minLength = 8;

    /** Maximum allowed password length. */
    readonly maxLength = 63;

    /** Whether the password is required to be entered. */
    readonly required = input(false);

    /** Whether the password is required to be "strong". */
    readonly strong = input(false);

    /** Value of the autocomplete attribute for the input. */
    readonly autocomplete = input('off');

    /** Placeholder for the input. */
    readonly placeholder = input('');

    /** Whether to show/edit the password in plain text. */
    readonly plain     = signal(false);
    readonly inputType = computed(() => this.plain() ? 'text' : 'password');
    readonly icon      = computed<IconDefinition>(() => this.plain() ? faEye : faEyeSlash);

    /** Whether the corresponding control is disabled. */
    readonly disabled = signal(false);

    /** Errors discovered during validation, if any. */
    errors: ValidationErrors = {};

    /** The associated control. */
    ngControl?: NgControl;

    /** The currently entered password value. */
    private _value = '';

    private _onChange?: (_: any) => void;
    private _onBlur?: () => void;

    constructor(
        private readonly injector: Injector,
    ) {}

    get value(): string {
        return this._value;
    }

    set value(v: string) {
        this._value = v;
        this._onChange?.(v);
    }

    ngOnInit(): void {
        this.ngControl = this.injector.get(NgControl);
    }

    onBlur() {
        this._onBlur?.();
    }

    registerOnChange(fn: (_: any) => void): void {
        this._onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this._onBlur = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled.set(isDisabled);
    }

    writeValue(value: string): void {
        this.value = value;
    }

    /** NG_VALIDATORS implementation */
    validate(control: AbstractControl): ValidationErrors | null {
        this.errors = {};
        const val: string = control.value;

        // Validate required
        if (this.required() && val === '') {
            this.errors.required = true;
        }

        // Validate max length
        if (val.length > this.maxLength) {
            this.errors.maxlength = true;
        }

        // Validate strong
        if (this.strong() && val !== '') {
            // Validate min length
            if (val.length < this.minLength) {
                this.errors.minlength = true;
            }

            // Iterate through known validation regexes
            const strong = Object.keys(PasswordInputComponent.Regexes).reduce(
                (acc, key) => {
                    if (!val.match((PasswordInputComponent.Regexes as any)[key])) {
                        acc[key] = true;
                    }
                    return acc;
                },
                {} as ValidationErrors);

            // Add a 'strong' key if there was a problem
            if (Object.keys(strong).length) {
                this.errors.strong = strong;
            }
        }

        return this.errors;
    }

    togglePlain() {
        this.plain.update(b => !b);
    }
}
