import { Component, OnInit } from '@angular/core';
import { faCheckDouble, faPlus } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from "@ngneat/until-destroy";
import { ApiGeneralService, Domain } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Paths } from '../../../../_utils/consts';
import { DomainSelectorService } from "../../_services/domain-selector.service";

@UntilDestroy()
@Component({
    selector: 'app-domain-manager',
    templateUrl: './domain-manager.component.html',
})
export class DomainManagerComponent implements OnInit {

    domains?: Domain[];
    domain?: Domain;

    readonly domainsLoading = new ProcessingStatus();
    readonly Paths = Paths;

    // Icons
    readonly faCheckDouble = faCheckDouble;
    readonly faPlus        = faPlus;

    constructor(
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {
        this.domainSelectorSvc.domain.pipe(untilDestroyed(this)).subscribe(d => this.domain = d);
    }

    ngOnInit(): void {
        // Load domain list
        this.api.domainList().pipe(this.domainsLoading.processing()).subscribe(d => this.domains = d.domains);
    }

    unselect() {
        this.domainSelectorSvc.setDomainId(undefined);
    }
}
