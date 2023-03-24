import { Component, ElementRef, EventEmitter, forwardRef, HostBinding, Injector, Input, OnInit, Output, ViewChild } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, NgControl, ValidationErrors } from '@angular/forms';
import { faEye } from '@fortawesome/free-solid-svg-icons';

@Component({
    selector: 'app-password-input',
    templateUrl: './password-input.component.html',
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
})
export class PasswordInputComponent implements OnInit, ControlValueAccessor {

    /**
     * Patterns that turn into errors when they don't match the entered value (only when strong == true).
     */
    static readonly Regexes = {
        upper:   /[A-Z]/,
        lower:   /[a-z]/,
        special: /[-\d!"#$%&'()*+,./:;<=>?@\[\\\]^_`{|}~]/,
    };

    /** Whether the password is required to be entered. */
    @Input() required = false;

    /** Whether the password is required to be "strong". */
    @Input() strong = false;

    /** Value of the autocomplete attribute for the input. */
    @Input() autocomplete = 'off';

    /** Placeholder for the input. */
    @Input() placeholder = '';

    @Output()
    readonly valueChange = new EventEmitter<string>();

    @ViewChild('input', {static: true}) input?: ElementRef;

    @HostBinding('class')
    private readonly _hostClasses = 'input-group has-validation';

    readonly minLength = 8;

    readonly maxLength = 63;

    // Icons
    readonly faEye = faEye;

    /** Whether to show/edit the password in plain text. */
    plain = false;

    /** Errors discovered during validation, if any. */
    errors: ValidationErrors = {};

    ngControl?: NgControl;

    private _value?: string;
    private _onChange?: (_: any) => void;
    private _onBlur?: () => void;

    constructor(
        private readonly injector: Injector,
    ) {}

    get value(): string {
        return this._value || '';
    }

    @Input()
    set value(v: string) {
        this._value = v;
        this.valueChange.emit(v);
        if (this._onChange) {
            this._onChange(v);
        }
    }

    ngOnInit(): void {
        this.ngControl = this.injector.get(NgControl);
    }

    onBlur() {
        if (this._onBlur) {
            this._onBlur();
        }
    }

    registerOnChange(fn: (_: any) => void): void {
        this._onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this._onBlur = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        (this.input!.nativeElement as HTMLInputElement).disabled = isDisabled;
    }

    writeValue(value: string): void {
        this.value = value;
    }

    /** NG_VALIDATORS implementation */
    validate(control: AbstractControl): ValidationErrors | null {
        this.errors = {};
        const val: string = control.value;

        // Validate required
        if (this.required && val === '') {
            this.errors.required = true;
        }

        // Validate max length
        if (val.length > this.maxLength) {
            this.errors.maxlength = true;
        }

        // Validate strong
        if (this.strong && val !== '') {
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
}
