import { Component, OnInit } from '@angular/core';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { ApiOwnerService, Domain } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Paths } from '../../../../_utils/consts';

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
        private readonly api: ApiOwnerService,
    ) {}

    ngOnInit(): void {
        // Load domain list
        this.api.domainList().pipe(this.domainsLoading.processing()).subscribe(d => this.domains = d.domains);
    }
}
