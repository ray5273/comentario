import { Component, OnInit } from '@angular/core';
import { ApiOwnerService, Domain } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';

@Component({
    selector: 'app-domain-manager',
    templateUrl: './domain-manager.component.html',
})
export class DomainManagerComponent implements OnInit {

    domains?: Domain[];

    readonly domainsLoading = new ProcessingStatus();

    constructor(
        private readonly api: ApiOwnerService,
    ) {}

    ngOnInit(): void {
        // Load domain list
        this.api.domainList().pipe(this.domainsLoading.processing()).subscribe(d => this.domains = d.domains);
    }
}
