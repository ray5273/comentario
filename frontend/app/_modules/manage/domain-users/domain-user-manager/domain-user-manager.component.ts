import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DomainSelectorService } from '../../_services/domain-selector.service';
import { Domain } from '../../../../../generated-api';

@UntilDestroy()
@Component({
    selector: 'app-domain-user-manager',
    templateUrl: './domain-user-manager.component.html',
})
export class DomainUserManagerComponent implements OnInit {

    /** Domain being displayed. */
    domain?: Domain;

    constructor(
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}

    ngOnInit(): void {
        // Subscribe to domain changes
        this.domainSelectorSvc.domainMeta
            .pipe(untilDestroyed(this))
            .subscribe(meta => this.domain = meta.domain);
    }
}
