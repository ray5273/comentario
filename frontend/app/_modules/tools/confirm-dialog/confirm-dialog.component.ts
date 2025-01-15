import { Component, Input, TemplateRef, ViewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faExclamationTriangle, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-confirm-dialog',
    templateUrl: './confirm-dialog.component.html',
    imports: [
        FaIconComponent,
        NgTemplateOutlet,
    ],
})
export class ConfirmDialogComponent {

    /** Optional title to display in the modal header. */
    @Input() title?: string;

    /** Template or HTML string to render as the dialog's content. */
    @Input() content?: string | TemplateRef<any>;

    /** Action button label. */
    @Input() actionLabel?: string;

    /** Whether the action button is enabled. */
    @Input() actionEnabled = true;

    /** The class of the action button. */
    @Input() actionType: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' = 'danger';

    /** Name of the icon. */
    @Input() icon: IconDefinition = faExclamationTriangle;

    @ViewChild('textTempl', {static: true})
    textTempl?: TemplateRef<any>;

    constructor(
        private readonly sanitizer: DomSanitizer,
        readonly activeModal: NgbActiveModal,
    ) {}

    get safeHtml(): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(this.content?.toString() || '');
    }

    get template(): TemplateRef<any> | null {
        return (typeof this.content === 'string' ? this.textTempl : this.content) || null;
    }
}
