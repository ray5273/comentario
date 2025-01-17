import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { DomainSelectorService } from '../../_services/domain-selector.service';

/**
 * Component that shows a badge for the currently selected domain, if any, otherwise a badge reading "All domains."
 */
@Component({
    selector: 'app-domain-badge',
    templateUrl: './domain-badge.component.html',
    host: {class: 'overflow-hidden'},
    imports: [
        AsyncPipe,
    ],
})
export class DomainBadgeComponent {
    constructor(
        readonly domainSelectorSvc: DomainSelectorService,
    ) {}
}
