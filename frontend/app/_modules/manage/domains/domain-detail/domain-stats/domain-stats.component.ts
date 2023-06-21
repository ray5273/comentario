import { Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Domain } from '../../../../../../generated-api';
import { DomainSelectorService } from '../../../_services/domain-selector.service';

@UntilDestroy()
@Component({
    selector: 'app-domain-stats',
    templateUrl: './domain-stats.component.html',
})
export class DomainStatsComponent {

    domain?: Domain;

    constructor(
        domainSelectorSvc: DomainSelectorService,
    ) {
        // Subscribe to domain changes
        domainSelectorSvc.domain.pipe(untilDestroyed(this)).subscribe(d => this.domain = d);
    }
}
