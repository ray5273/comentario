import { Component } from '@angular/core';
import { DomainSelectorService } from '../_services/domain-selector.service';

@Component({
    selector: 'app-stats',
    templateUrl: './stats.component.html',
})
export class StatsComponent {

    readonly domain$ = this.domainSelectorSvc.domain;

    constructor(
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}
}
