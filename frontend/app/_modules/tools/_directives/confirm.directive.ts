import { Directive, EventEmitter, HostListener, Input, Output, TemplateRef } from '@angular/core';
import { noop } from 'rxjs';
import { faExclamationTriangle, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Directive({
    selector: '[appConfirm]',
})
export class ConfirmDirective {

    /**
     * Optional HTML or template to display in the confirmation dialog. If not provided, the confirmation is silently given on click,
     * without showing a dialog.
     */
    @Input() appConfirm?: string | TemplateRef<any>;

    /** Optional title to display in the confirmation dialog's header. */
    @Input() confirmTitle?: string;

    /** Action button label in the confirmation dialog. */
    @Input() confirmAction = 'OK';

    /** Name of the icon in the confirmation dialog. */
    @Input() confirmIcon: IconDefinition = faExclamationTriangle;

    /** Fired when the user clicks the action button. */
    @Output()
    readonly confirmed = new EventEmitter<void>();

    private _dlg?: ConfirmDialogComponent;
    private _enableAction = true;

    constructor(
        private readonly modal: NgbModal,
    ) {}

    /**
     * Whether the action button in the dialog is enabled (tracks changes also when the dialog is already opened).
     */
    @Input()
    set confirmActionEnabled(v: boolean) {
        // Pass through to the dialog if it's open
        this._enableAction = v;
        if (this._dlg) {
            this._dlg.actionEnabled = v;
        }
    }

    @HostListener('click', ['$event'])
    private clicked(event: Event) {
        // Do not propagate further
        event.stopPropagation();

        // If there's no content to be shown, issue a confirmation event right away
        if (!this.appConfirm) {
            this.confirmed.emit();
            return;
        }

        // Show a dialog otherwise
        const mr = this.modal.open(ConfirmDialogComponent);
        const dlg = mr.componentInstance;
        dlg.title         = this.confirmTitle;
        dlg.content       = this.appConfirm;
        dlg.actionLabel   = this.confirmAction;
        dlg.actionEnabled = this._enableAction;
        dlg.icon          = this.confirmIcon;
        this._dlg = dlg;

        // Fire the confirmed event on resolution, swallow on rejection
        mr.result
            .then(() => this.confirmed.emit(), noop)
            .finally(() => this._dlg = undefined);
    }
}
