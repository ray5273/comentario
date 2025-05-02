import { ConfirmDirective } from './confirm.directive';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component, DebugElement, signal, TemplateRef } from '@angular/core';
import { noop } from 'rxjs';
import { faExclamationTriangle, faKey, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { MockProvider } from 'ng-mocks';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
    template: `
        <button appConfirm="Are you sure dude" (confirmed)="confirmed()">1</button>
        <button [appConfirm]="t" confirmTitle="HI THERE" confirmAction="YES" [confirmIcon]="faKey" (confirmed)="confirmed()">2</button>
        <ng-template #t>I am text</ng-template>
        <button appConfirm="" (confirmed)="confirmed()">3</button>
    `,
    imports: [ConfirmDirective],
})
class TestComponent {
    readonly faKey = faKey;
    confirmed = noop;
}

describe('ConfirmDirective', () => {

    let fixture: ComponentFixture<TestComponent>;
    let de: DebugElement[];
    let btn1: HTMLButtonElement;
    let btn2: HTMLButtonElement;
    let btn3: HTMLButtonElement;
    let opened: boolean;
    let dialog: ConfirmDialogComponent;

    // Returns a fake NgbModalRef, which points to a fake ConfirmDialogComponent
    const getModalRef = () => {
        opened = true;
        dialog = {
            title:         signal<string | undefined>(undefined),
            content:       signal<string | TemplateRef<any> | undefined>(undefined),
            actionLabel:   signal<string | undefined>(undefined),
            actionEnabled: signal(true),
            actionType:    signal<string>('danger'),
            icon:          signal<IconDefinition>(faExclamationTriangle),
        } as ConfirmDialogComponent;
        return {
            componentInstance: dialog,
            result:            Promise.reject(), // Imitate cancelling the dialog
        } as NgbModalRef;
    };

    beforeEach(() => {
        opened = false;
        fixture = TestBed.configureTestingModule({
                imports: [ConfirmDirective, TestComponent],
                providers: [MockProvider(NgbModal, {open: getModalRef})],
            })
            .createComponent(TestComponent);
        fixture.detectChanges();

        // All elements with an attached directive
        de = fixture.debugElement.queryAll(By.directive(ConfirmDirective));

        // Fetch the native element
        btn1 = de[0].nativeElement as HTMLButtonElement;
        btn2 = de[1].nativeElement as HTMLButtonElement;
        btn3 = de[2].nativeElement as HTMLButtonElement;
    });

    it('binds to elements', () => {
        expect(btn1).toBeTruthy();
        expect(btn2).toBeTruthy();
        expect(btn3).toBeTruthy();
    });

    it('opens modal with text', () => {
        btn1.click();
        fixture.detectChanges();
        expect(opened).toBeTrue();
        expect(dialog.title()).toBeUndefined();
        expect(dialog.content()).toBe('Are you sure dude');
        expect(dialog.actionLabel()).toBe('OK');
        expect(dialog.icon()).toBe(faExclamationTriangle);
    });

    it('opens modal with template', () => {
        btn2.click();
        fixture.detectChanges();
        expect(opened).toBeTrue();
        expect(dialog.title()).toBe('HI THERE');
        expect(dialog.content()).toBeInstanceOf(TemplateRef);
        expect(dialog.actionLabel()).toBe('YES');
        expect(dialog.icon()).toBe(faKey);
    });

    it('confirms silently when no content available', (done: DoneFn) => {
        fixture.componentInstance.confirmed = () => {
            expect(opened).toBeFalse();
            done();
        };
        btn3.click();
    });
});
