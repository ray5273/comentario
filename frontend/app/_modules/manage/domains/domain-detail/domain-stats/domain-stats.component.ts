import { Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Domain } from '../../../../../../generated-api';
import { DomainDetailComponent } from '../domain-detail.component';

@UntilDestroy()
@Component({
    selector: 'app-domain-stats',
    templateUrl: './domain-stats.component.html',
})
export class DomainStatsComponent {

    domain?: Domain;

    constructor(
        details: DomainDetailComponent,
    ) {
        // Subscribe to domain changes
        details.domain.pipe(untilDestroyed(this)).subscribe(d => this.domain = d);
    }
}
