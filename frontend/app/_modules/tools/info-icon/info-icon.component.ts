import { Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { DocsService } from '../../../_services/docs.service';

@Component({
    selector: 'app-info-icon',
    templateUrl: './info-icon.component.html',
    styleUrls: ['./info-icon.component.scss'],
    host: {
        '[class.float-start]': 'position() === "left"',
        '[class.float-end]':   'position() === "right"',
    },
    imports: [
        FaIconComponent,
        NgClass,
        NgbTooltip,
    ],
})
export class InfoIconComponent {

    /** Whether the icon should float on left or right. */
    readonly position = input<'left' | 'right'>();

    /** Text of the tooltip to display. */
    readonly tooltip = input<string>();

    /** Optional link to a documentation page. */
    readonly docLink = input<string>();

    /** Optional icon class or class list. */
    readonly iconClasses = input<string | string[] | Set<string>>('text-secondary');

    /** Documentation URL for a clickable icon. */
    readonly docUrl = computed(() => this.docLink() && this.docSvc.getPageUrl(this.docLink()!));

    // Icons
    readonly faInfoCircle = faInfoCircle;

    constructor(
        private readonly docSvc: DocsService,
    ) {}
}
