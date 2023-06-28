import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder } from '@angular/forms';
import { faCheckDouble, faPlus } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiGeneralService, Domain } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Paths } from '../../../../_utils/consts';
import { DomainSelectorService } from '../../_services/domain-selector.service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

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

    readonly filterForm = this.fb.nonNullable.group({
        filter: '',
    });

    // Icons
    readonly faCheckDouble = faCheckDouble;
    readonly faPlus        = faPlus;

    constructor(
        private readonly fb: FormBuilder,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {
        this.domainSelectorSvc.domain.pipe(untilDestroyed(this)).subscribe(d => this.domain = d);
    }

    get ctlFilterFilter(): AbstractControl<string> {
        return this.filterForm.get('filter')!;
    }

    ngOnInit(): void {
        // Load domain list
        this.reload();

        // Subscribe to filter changes
        this.ctlFilterFilter.valueChanges.pipe(debounceTime(500), distinctUntilChanged()).subscribe(() => this.reload());
    }

    unselect() {
        this.domainSelectorSvc.setDomainId(undefined);
    }

    private reload() {
        this.api.domainList(this.ctlFilterFilter.value).pipe(this.domainsLoading.processing()).subscribe(d => this.domains = d.domains);
    }
}
