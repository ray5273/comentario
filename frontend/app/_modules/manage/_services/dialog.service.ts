import { inject, Injectable, TemplateRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { ConfirmDialogComponent } from '../../tools/confirm-dialog/confirm-dialog.component';

export interface ConfirmationDialogOptions {
    /** Optional title to display in the modal header. */
    title?: string;
    /** Optional class of the action button, defaults to 'danger'. */
    actionType?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    /** Optional dialog icon, defaults to the "exclamation triangle" icon.  */
    icon?: IconDefinition;
}

/**
 * Service for showing modal dialogs.
 */
@Injectable({
    providedIn: 'root',
})
export class DialogService {

    private readonly modal = inject(NgbModal);

    /**
     * Show a confirmation dialog, resolving to true when it's confirmed, or to false otherwise.
     * @param content Template or HTML string to render as the dialog's content.
     * @param actionLabel Action button label.
     * @param options Additional dialog options.
     */
    async confirm(content: string | TemplateRef<any>, actionLabel: string, options?: ConfirmationDialogOptions): Promise<boolean> {
        // Show a confirmation dialog
        const mr = this.modal.open(ConfirmDialogComponent);

        // Set up the dialog's properties
        const dlg = (mr.componentInstance as ConfirmDialogComponent);
        dlg.content    .set(content);
        dlg.actionLabel.set(actionLabel);
        if (options?.title) {
            dlg.title.set(options.title);
        }
        if (options?.actionType) {
            dlg.actionType.set(options.actionType);
        }
        if (options?.icon) {
            dlg.icon.set(options.icon);
        }

        // Run the dialog
        return mr.result.then(() => true).catch(() => false);
    }
}
