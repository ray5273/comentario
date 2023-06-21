import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { DomainSelectorService } from '../../_services/domain-selector.service';

@UntilDestroy()
@Component({
    selector: 'app-domain-detail',
    templateUrl: './domain-detail.component.html',
})
export class DomainDetailComponent implements OnInit {

    constructor(
        private readonly route: ActivatedRoute,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}

    ngOnInit(): void {
        // Subscribe to route parameter changes to update domain selector
        this.route.paramMap.subscribe(pm => this.domainSelectorSvc.setDomainId(pm.get('id') || undefined, false));
    }
}
