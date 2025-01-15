import { Component, HostBinding, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { DocsService } from '../../../_services/docs.service';

@Component({
    selector: 'app-info-icon',
    templateUrl: './info-icon.component.html',
    styleUrls: ['./info-icon.component.scss'],
    imports: [
        FaIconComponent,
        NgClass,
        NgbTooltip,
    ],
})
export class InfoIconComponent {

    /** Whether the icon should float on left or right. */
    @Input()
    position?: 'left' | 'right';

    /** Text of the tooltip to display. */
    @Input()
    tooltip?: string;

    /** Optional link to a documentation page. */
    @Input()
    docLink?: string;

    /** Optional icon class or class list. */
    @Input()
    iconClasses?: string | string[] | Set<string> = 'text-secondary';

    // Icons
    readonly faInfoCircle = faInfoCircle;

    constructor(
        private readonly docSvc: DocsService,
    ) {}

    @HostBinding('class.float-start')
    get left(): boolean {
        return this.position === 'left';
    }

    @HostBinding('class.float-end')
    get right(): boolean {
        return this.position === 'right';
    }

    get docUrl(): string | undefined {
        return this.docLink && this.docSvc.getPageUrl(this.docLink);
    }
}
