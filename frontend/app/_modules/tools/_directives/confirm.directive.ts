import { Directive, effect, input, output, signal, TemplateRef } from '@angular/core';
import { noop } from 'rxjs';
import { faExclamationTriangle, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Directive({
    selector: '[appConfirm]',
    host: {
        '(click)': 'clicked($event)',
    }
})
export class ConfirmDirective {

    /**
     * Optional HTML or template to display in the confirmation dialog. If not provided, the confirmation is silently
     * given on click, without showing a dialog.
     */
    readonly appConfirm = input<string | TemplateRef<any>>();

    /** Optional title to display in the confirmation dialog's header. */
    readonly confirmTitle = input<string>();

    /** Action button label in the confirmation dialog. */
    readonly confirmAction = input('OK');

    /** Action button type in the confirmation dialog. */
    readonly confirmActionType = input<'primary' | 'secondary' | 'success' | 'warning' | 'danger'>('danger');

    /** Name of the icon in the confirmation dialog. */
    readonly confirmIcon = input<IconDefinition>(faExclamationTriangle);

    /** Whether the action button in the dialog is enabled (tracks changes also when the dialog is already opened). */
    readonly confirmActionEnabled = input(true);

    /** Fired when the user clicks the action button. */
    readonly confirmed = output();

    /** The opened dialog instance, if any. */
    private readonly dlg = signal<ConfirmDialogComponent | undefined>(undefined);

    constructor(
        private readonly modal: NgbModal,
    ) {
        // Pass directive properties through to the dialog if it's open
        effect(() => {
            const dlg = this.dlg();
            if (dlg) {
                dlg.title        .set(this.confirmTitle());
                dlg.content      .set(this.appConfirm());
                dlg.actionType   .set(this.confirmActionType());
                dlg.actionLabel  .set(this.confirmAction());
                dlg.actionEnabled.set(this.confirmActionEnabled());
                dlg.icon         .set(this.confirmIcon());
            }
        });
    }

    clicked(event: Event) {
        // Do not propagate further
        event.stopPropagation();
        event.preventDefault();

        // If there's no content to be shown, issue a confirmation event right away
        if (!this.appConfirm()) {
            this.confirmed.emit();
            return;
        }

        // Show a dialog otherwise
        const mr = this.modal.open(ConfirmDialogComponent);
        this.dlg.set(mr.componentInstance);

        // Fire the confirmed event on resolution, swallow on rejection
        mr.result
            .then(() => this.confirmed.emit(), noop)
            .finally(() => this.dlg.set(undefined));
    }
}
