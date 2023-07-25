import { Component } from '@angular/core';
import { DomainSelectorService } from '../_services/domain-selector.service';

@Component({
    selector: 'app-stats',
    templateUrl: './stats.component.html',
})
export class StatsComponent {

    readonly domainMeta$ = this.domainSelectorSvc.domainMeta;

    constructor(
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}
}
