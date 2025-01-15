import { Component, HostBinding } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { DomainSelectorService } from '../../_services/domain-selector.service';

/**
 * Component that shows a badge for the currently selected domain, if any, otherwise a badge reading "All domains."
 */
@Component({
    selector: 'app-domain-badge',
    templateUrl: './domain-badge.component.html',
    imports: [
        AsyncPipe,
    ],
})
export class DomainBadgeComponent {

    @HostBinding('class')
    private readonly class = 'overflow-hidden';

    constructor(
        readonly domainSelectorSvc: DomainSelectorService,
    ) {}
}
