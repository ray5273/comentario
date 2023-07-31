import { Component } from '@angular/core';
import { DomainSelectorService } from '../../_services/domain-selector.service';

@Component({
    selector: 'app-domain-stats',
    templateUrl: './domain-stats.component.html',
})
export class DomainStatsComponent {

    readonly domainMeta$ = this.domainSelectorSvc.domainMeta;

    constructor(
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}
}
