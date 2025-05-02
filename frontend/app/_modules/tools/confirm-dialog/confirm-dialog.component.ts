import { Component, computed, model, TemplateRef, ViewChild } from '@angular/core';
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
    readonly title = model<string>();

    /** Template or HTML string to render as the dialog's content. */
    readonly content = model<string | TemplateRef<any>>();

    /** Action button label. */
    readonly actionLabel = model<string>();

    /** Whether the action button is enabled. */
    readonly actionEnabled = model(true);

    /** The class of the action button. */
    readonly actionType = model<'primary' | 'secondary' | 'success' | 'warning' | 'danger'>('danger');

    /** Name of the icon. */
    readonly icon = model<IconDefinition>(faExclamationTriangle);

    readonly safeHtml    = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(this.content()?.toString() || ''));
    readonly textClass   = computed(() => `text-${this.actionType()}`);
    readonly buttonClass = computed(() => `btn-${this.actionType()}`);
    readonly template    = computed<TemplateRef<any> | null>(() => {
        const c = this.content();
        return (typeof c === 'string' ? this.textTempl : c) || null;
    });

    @ViewChild('textTempl', {static: true})
    textTempl?: TemplateRef<any>;

    constructor(
        private readonly sanitizer: DomSanitizer,
        readonly activeModal: NgbActiveModal,
    ) {}
}
