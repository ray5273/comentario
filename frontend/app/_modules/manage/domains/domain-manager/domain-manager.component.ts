import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService, Domain } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Paths } from '../../../../_utils/consts';
import { DomainSelectorService } from '../../_services/domain-selector.service';

@Component({
    selector: 'app-domain-manager',
    templateUrl: './domain-manager.component.html',
})
export class DomainManagerComponent implements OnInit {

    domains?: Domain[];

    readonly domainsLoading = new ProcessingStatus();
    readonly Paths = Paths;

    // Icons
    readonly faPlus = faPlus;

    constructor(
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}

    ngOnInit(): void {
        // Load domain list
        this.api.domainList().pipe(this.domainsLoading.processing()).subscribe(d => this.domains = d.domains);
    }

    setDomain(d: Domain) {
        // Communicate domain selection to the selector service
        this.domainSelectorSvc.setDomainId(d.id, false);

        // Redirect to domain properties
        this.router.navigate([d.id], {relativeTo: this.route});
    }
}
